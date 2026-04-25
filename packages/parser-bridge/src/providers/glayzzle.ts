/**
 * Glayzzle (`php-parser` npm) provider. Produces canonical `PhpAst` from the
 * library's own AST. Used as the development fallback when PHP + nikic are
 * not available locally. See DESIGN.md § Decision Log D5.
 */

import { readFile } from "node:fs/promises";
import * as phpParser from "php-parser";
import {
  SCHEMA_VERSION,
  type PhpAst,
  type PhpExpr,
  type PhpNode,
  type Pos,
} from "../schema.js";

interface PhpParserEngine {
  parseCode(buffer: string, filename: string): unknown;
}
interface PhpParserCtor {
  new (options: unknown): PhpParserEngine;
}
// The glayzzle package ships a CJS default export that is the Engine class,
// but its .d.ts does not mirror that. Cast through the module namespace.
const Parser = (phpParser as unknown as { default?: PhpParserCtor } & PhpParserCtor)
  .default
  ?? (phpParser as unknown as PhpParserCtor);

const SUPERGLOBAL_NAMES = new Set([
  "_GET",
  "_POST",
  "_SESSION",
  "_COOKIE",
  "_SERVER",
  "_REQUEST",
  "_ENV",
  "_FILES",
  "GLOBALS",
]);

type AnyNode = Record<string, unknown> & {
  kind: string;
  loc?: { start?: { line: number; column: number } };
};

function makeParser(): PhpParserEngine {
  return new Parser({
    parser: { extractDoc: true, suppressErrors: false, version: "8.2" },
    ast: { withPositions: true, withSource: false },
    lexer: { short_tags: true },
  });
}

function pos(file: string, node: AnyNode): Pos {
  const start = node.loc?.start;
  return {
    file,
    line: start?.line ?? 0,
    col: start?.column ?? 0,
  };
}

function unknownStmt(file: string, node: AnyNode, detail: string): PhpNode {
  return { kind: "Unknown", detail, pos: pos(file, node) };
}

function unknownExpr(file: string, node: AnyNode, detail: string): PhpExpr {
  return { kind: "UnknownExpr", detail, pos: pos(file, node) };
}

function convertBody(file: string, body: unknown): PhpNode[] {
  if (!Array.isArray(body)) return [];
  return (body as AnyNode[]).map((n) => convertStatement(file, n));
}

function convertStatement(file: string, node: AnyNode): PhpNode {
  switch (node.kind) {
    case "inline":
      return { kind: "InlineHtml", text: String(node.value ?? ""), pos: pos(file, node) };
    case "echo": {
      const shortForm = Boolean(node.shortForm);
      const exprs = Array.isArray(node.expressions) ? (node.expressions as AnyNode[]) : [];
      return {
        kind: "Echo",
        values: exprs.map((e) => convertExpression(file, e)),
        pos: pos(file, { ...node, shortForm }),
      };
    }
    case "expressionstatement":
    case "expression": {
      const inner = node.expression as AnyNode;
      // Unwrap common statement-like expressions into proper statements.
      if (inner?.kind === "assign") {
        return convertStatement(file, inner);
      }
      if (inner?.kind === "include") {
        return convertStatement(file, inner);
      }
      if (inner?.kind === "exit" || inner?.kind === "die") {
        return convertStatement(file, inner);
      }
      return {
        kind: "ExpressionStatement",
        expr: convertExpression(file, inner),
        pos: pos(file, node),
      };
    }
    case "assign": {
      const op = typeof node.operator === "string" ? node.operator : "=";
      return {
        kind: "Assign",
        operator: (["=", "+=", "-=", ".=", "??="].includes(op) ? op : "=") as
          | "="
          | "+="
          | "-="
          | ".="
          | "??=",
        target: convertExpression(file, node.left as AnyNode),
        value: convertExpression(file, node.right as AnyNode),
        pos: pos(file, node),
      };
    }
    case "if": {
      const elseNode = node.alternate as AnyNode | null;
      let elseBody: PhpNode[] | null = null;
      if (elseNode) {
        if (elseNode.kind === "block") {
          elseBody = convertBody(file, elseNode.children);
        } else if (elseNode.kind === "if") {
          elseBody = [convertStatement(file, elseNode)];
        } else {
          elseBody = [convertStatement(file, elseNode)];
        }
      }
      const body = node.body as AnyNode | undefined;
      const thenBody = body?.kind === "block" ? convertBody(file, body.children) : body ? [convertStatement(file, body)] : [];
      return {
        kind: "If",
        cond: convertExpression(file, node.test as AnyNode),
        then: thenBody,
        else: elseBody,
        pos: pos(file, node),
      };
    }
    case "foreach": {
      const body = node.body as AnyNode | undefined;
      const bodyArr = body?.kind === "block" ? convertBody(file, body.children) : body ? [convertStatement(file, body)] : [];
      const key = node.key as AnyNode | null;
      const value = node.value as AnyNode;
      return {
        kind: "Foreach",
        iterable: convertExpression(file, node.source as AnyNode),
        keyName: key && key.kind === "variable" ? String(key.name ?? "") : null,
        valueName: value?.kind === "variable" ? String(value.name ?? "_") : "_",
        body: bodyArr,
        pos: pos(file, node),
      };
    }
    case "return":
      return {
        kind: "Return",
        value: node.expr ? convertExpression(file, node.expr as AnyNode) : null,
        pos: pos(file, node),
      };
    case "include":
      return {
        kind: "Require",
        once: Boolean(node.once),
        path: convertExpression(file, node.target as AnyNode),
        pos: pos(file, node),
      };
    case "function": {
      const args = Array.isArray(node.arguments) ? (node.arguments as AnyNode[]) : [];
      const body = node.body as AnyNode | undefined;
      return {
        kind: "FunctionDecl",
        name: String((node.name as AnyNode)?.name ?? node.name ?? "<anonymous>"),
        params: args.map((a) => ({
          name: String((a.name as AnyNode | string) instanceof Object ? (a.name as AnyNode).name : a.name ?? ""),
          hint: typeNameFromHint(a.type as AnyNode | null),
          default: a.value ? convertExpression(file, a.value as AnyNode) : null,
        })),
        returnHint: typeNameFromHint(node.type as AnyNode | null),
        body: body?.kind === "block" ? convertBody(file, body.children) : [],
        pos: pos(file, node),
      };
    }
    case "exit":
    case "die":
      return {
        kind: "Exit",
        value:
          (node.expression as AnyNode | undefined)
            ? convertExpression(file, node.expression as AnyNode)
            : (node.status as AnyNode | undefined)
              ? convertExpression(file, node.status as AnyNode)
              : null,
        pos: pos(file, node),
      };
    case "static": {
      // `static $x = ...;` — function-scoped persistence. A faithful TS
      // equivalent requires module-scoped mutable state with initialization
      // guard. Marking as Unknown for now; ingest will lower this to a hole.
      return unknownStmt(file, node, "static variable declaration");
    }
    case "declare": {
      // `declare(strict_types=1);` — PHP runtime typing; WebIR uses explicit
      // lowering elsewhere. Parser emits a no-op; ingest drops it.
      return { kind: "Noop", pos: pos(file, node) };
    }
    case "block":
      return unknownStmt(file, node, "bare block");
    default:
      return unknownStmt(file, node, `unhandled stmt: ${node.kind}`);
  }
}

function typeNameFromHint(hint: AnyNode | null): string | null {
  if (!hint) return null;
  if (hint.kind === "identifier") return String((hint as AnyNode).name ?? "");
  if (hint.kind === "typereference") return String((hint as AnyNode).name ?? "");
  return null;
}

function convertExpression(file: string, node: AnyNode | null | undefined): PhpExpr {
  if (!node) return { kind: "UnknownExpr", detail: "null-expr", pos: { file, line: 0, col: 0 } };
  switch (node.kind) {
    case "number":
    case "inline_number":
      return {
        kind: "Literal",
        literalKind: Number.isInteger(Number(node.value)) ? "int" : "float",
        value: Number(node.value),
        raw: String(node.value),
        pos: pos(file, node),
      };
    case "string": {
      const raw = typeof node.raw === "string" ? (node.raw as string) : String(node.value ?? "");
      return {
        kind: "Literal",
        literalKind: "string",
        value: String(node.value ?? ""),
        raw,
        pos: pos(file, node),
      };
    }
    case "boolean":
      return {
        kind: "Literal",
        literalKind: "bool",
        value: Boolean(node.value),
        raw: node.value ? "true" : "false",
        pos: pos(file, node),
      };
    case "nullkeyword":
    case "null":
      return {
        kind: "Literal",
        literalKind: "null",
        value: null,
        raw: "null",
        pos: pos(file, node),
      };
    case "variable": {
      const name = String(node.name ?? "");
      if (SUPERGLOBAL_NAMES.has(name)) {
        return {
          kind: "Superglobal",
          name: name as
            | "_GET"
            | "_POST"
            | "_SESSION"
            | "_COOKIE"
            | "_SERVER"
            | "_REQUEST"
            | "_ENV"
            | "_FILES"
            | "GLOBALS",
          pos: pos(file, node),
        };
      }
      return { kind: "Variable", name, pos: pos(file, node) };
    }
    case "offsetlookup":
      return {
        kind: "ArrayAccess",
        target: convertExpression(file, node.what as AnyNode),
        index: convertExpression(file, node.offset as AnyNode),
        pos: pos(file, node),
      };
    case "bin":
      return {
        kind: "BinOp",
        operator: String(node.type ?? ""),
        left: convertExpression(file, node.left as AnyNode),
        right: convertExpression(file, node.right as AnyNode),
        pos: pos(file, node),
      };
    case "unary":
    case "pre":
    case "post":
      return {
        kind: "UnaryOp",
        operator:
          (["!", "-", "+", "~"].includes(String(node.type)) ? String(node.type) : "!") as
            | "!"
            | "-"
            | "+"
            | "~",
        operand: convertExpression(file, node.what as AnyNode),
        pos: pos(file, node),
      };
    case "retif":
      return {
        kind: "Ternary",
        cond: convertExpression(file, node.test as AnyNode),
        then: node.trueExpr ? convertExpression(file, node.trueExpr as AnyNode) : null,
        else: convertExpression(file, node.falseExpr as AnyNode),
        pos: pos(file, node),
      };
    case "coalesce":
      return {
        kind: "Coalesce",
        left: convertExpression(file, node.left as AnyNode),
        right: convertExpression(file, node.right as AnyNode),
        pos: pos(file, node),
      };
    case "call": {
      const what = node.what as AnyNode;
      const args = Array.isArray(node.arguments) ? (node.arguments as AnyNode[]) : [];
      let callee: { kind: "name"; name: string } | { kind: "variable"; name: string } | { kind: "expr"; expr: PhpExpr };
      if (what.kind === "name" || what.kind === "identifier") {
        callee = { kind: "name", name: String(what.name ?? "") };
      } else if (what.kind === "variable") {
        callee = { kind: "variable", name: String(what.name ?? "") };
      } else {
        callee = { kind: "expr", expr: convertExpression(file, what) };
      }
      return {
        kind: "Call",
        callee,
        args: args.map((a) => convertExpression(file, a)),
        pos: pos(file, node),
      };
    }
    case "array": {
      const items = Array.isArray(node.items) ? (node.items as AnyNode[]) : [];
      return {
        kind: "Array",
        items: items.map((it) => ({
          key: it.key ? convertExpression(file, it.key as AnyNode) : null,
          value: convertExpression(file, it.value as AnyNode),
        })),
        pos: pos(file, node),
      };
    }
    case "cast": {
      const type = String(node.type ?? "").toLowerCase();
      const allowed = ["int", "float", "string", "bool", "array"] as const;
      const castKind = (allowed as readonly string[]).includes(type) ? (type as (typeof allowed)[number]) : "string";
      return {
        kind: "Cast",
        castKind,
        expr: convertExpression(file, node.expr as AnyNode),
        pos: pos(file, node),
      };
    }
    case "parenthesis":
      return convertExpression(file, node.inner as AnyNode);
    case "empty": {
      // PHP's `empty($x)` returns true iff $x is empty; we lower it to a
      // call to the `__empty` runtime helper, which preserves that polarity.
      // No extra negation — negating here would make `if (empty($x))` and
      // `if (!empty($x))` both emit as `if (!empty(...))`, silently flipping
      // the branch logic for every page that branches on emptiness.
      const arg = node.expression as AnyNode ?? (node.what as AnyNode);
      return {
        kind: "Call",
        callee: { kind: "name", name: "__empty" },
        args: [convertExpression(file, arg)],
        pos: pos(file, node),
      };
    }
    case "isset": {
      const vars = (node.variables as AnyNode[] | undefined) ?? [];
      return {
        kind: "Call",
        callee: { kind: "name", name: "__isset" },
        args: vars.map((v) => convertExpression(file, v)),
        pos: pos(file, node),
      };
    }
    case "assign":
      // `$a = $b` used as an expression (rare, but legal in PHP). Model as a
      // call to a pseudo-function so ingest can flag it for a hole.
      return {
        kind: "Call",
        callee: { kind: "name", name: "__assign_expr" },
        args: [
          convertExpression(file, node.left as AnyNode),
          convertExpression(file, node.right as AnyNode),
        ],
        pos: pos(file, node),
      };
    case "include":
      return {
        kind: "Call",
        callee: { kind: "name", name: node.once ? "__require_once" : "__require" },
        args: [convertExpression(file, node.target as AnyNode)],
        pos: pos(file, node),
      };
    case "constref":
    case "name":
    case "identifier":
      return { kind: "ConstFetch", name: String(node.name ?? ""), pos: pos(file, node) };
    case "staticlookup":
      return {
        kind: "StaticFetch",
        className: String((node.what as AnyNode)?.name ?? ""),
        name: String((node.offset as AnyNode)?.name ?? ""),
        pos: pos(file, node),
      };
    case "propertylookup":
      return {
        kind: "PropertyFetch",
        target: convertExpression(file, node.what as AnyNode),
        name: String((node.offset as AnyNode)?.name ?? ""),
        pos: pos(file, node),
      };
    case "encapsed": {
      // Double-quoted string with interpolations. Flatten into Concat via BinOp tree.
      const parts = Array.isArray(node.value) ? (node.value as AnyNode[]) : [];
      const converted = parts.map((p) => {
        if (p.kind === "encapsedpart") {
          if ((p.expression as AnyNode)?.kind === "string") {
            return convertExpression(file, p.expression as AnyNode);
          }
          return convertExpression(file, p.expression as AnyNode);
        }
        return convertExpression(file, p);
      });
      if (converted.length === 0) {
        return {
          kind: "Literal",
          literalKind: "string",
          value: "",
          raw: '""',
          pos: pos(file, node),
        };
      }
      return converted.reduce((acc, cur) => ({
        kind: "BinOp",
        operator: ".",
        left: acc,
        right: cur,
        pos: pos(file, node),
      }));
    }
    default:
      return unknownExpr(file, node, `unhandled expr: ${node.kind}`);
  }
}

export async function parseFileWithGlayzzle(path: string): Promise<PhpAst> {
  const src = await readFile(path, "utf8");
  return parseSourceWithGlayzzle(src, path);
}

export function parseSourceWithGlayzzle(src: string, filename: string): PhpAst {
  const parser = makeParser();
  const program = parser.parseCode(src, filename) as unknown as AnyNode;
  const children = (program.children as AnyNode[] | undefined) ?? [];
  return {
    schemaVersion: SCHEMA_VERSION,
    file: filename,
    statements: children.map((c) => convertStatement(filename, c)),
  };
}
