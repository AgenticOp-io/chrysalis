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
  type PhpAttribute,
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

/** Combine outer PHP namespace with a relative `namespace` declaration name. */
function composePhpNamespacePrefix(parentNs: string, declaredName: string): string {
  const d = declaredName.trim();
  if (!d) return parentNs;
  if (!parentNs) return d;
  return `${parentNs}\\${d}`;
}

/** `name` on a php-parser `namespace` node (string, identifier, or composite array). */
function extractNamespaceDeclaredName(node: AnyNode): string {
  const raw = node.name;
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    const parts: string[] = [];
    for (const p of raw as unknown[]) {
      if (typeof p === "string") parts.push(p);
      else if (p && typeof p === "object" && "name" in (p as AnyNode)) {
        parts.push(String((p as AnyNode).name ?? ""));
      }
    }
    return parts.filter(Boolean).join("\\");
  }
  if (typeof raw === "object" && (raw as AnyNode).kind === "identifier") {
    return String((raw as AnyNode).name ?? "");
  }
  return "";
}

/** Top-level (and nested) statement list with namespace prefixing for `FunctionDecl` names. */
function convertProgramStatements(file: string, nodes: AnyNode[], parentNs: string): PhpNode[] {
  const out: PhpNode[] = [];
  for (const node of nodes) {
    if (node.kind === "namespace") {
      const declared = extractNamespaceDeclaredName(node);
      const innerNs = composePhpNamespacePrefix(parentNs, declared);
      const inner = (node.children as AnyNode[] | undefined) ?? [];
      out.push(...convertProgramStatements(file, inner, innerNs));
    } else if (node.kind === "class") {
      out.push(...convertTopLevelClassToFunctionDecls(file, node, parentNs));
    } else if (node.kind === "enum") {
      out.push(...convertTopLevelEnumToFunctionDecls(file, node, parentNs));
    } else {
      out.push(convertStatement(file, node, parentNs));
    }
  }
  return out;
}

/**
 * Flatten top-level class methods into `FunctionDecl` with `Class::method` names.
 * Static methods are hoisted for call-effect inference; the non-static `__invoke`
 * is also hoisted so manifest routes that point at an invokable controller can
 * lift the method body as the handler (see ingest `selectRouteHandlerStatements`).
 */
function convertTopLevelClassToFunctionDecls(file: string, classNode: AnyNode, nsPrefix: string): PhpNode[] {
  const classShort = String((classNode.name as AnyNode | undefined)?.name ?? "");
  if (!classShort) {
    return [unknownStmt(file, classNode, "class without name")];
  }
  const classFqn = nsPrefix ? `${nsPrefix}\\${classShort}` : classShort;
  const members = Array.isArray(classNode.body) ? (classNode.body as AnyNode[]) : [];
  const out: PhpNode[] = [];
  const properties: import("../schema.js").PhpClassProperty[] = [];

  for (const member of members) {
    if (member.kind !== "propertystatement" && member.kind !== "property") continue;
    const propsRaw = member.properties ?? (member.kind === "property" ? [member] : undefined);
    const props = Array.isArray(propsRaw) ? (propsRaw as AnyNode[]) : [];
    for (const prop of props) {
      const propName = String((prop.name as AnyNode | undefined)?.name ?? prop.name ?? "");
      if (!propName) continue;
      const typeHint = typeNameFromHint((prop.type ?? member.type) as AnyNode | null);
      const readonly = Boolean(prop.readonly ?? member.readonly);
      properties.push({ name: propName, typeHint, readonly });
    }
  }

  for (const member of members) {
    if (member.kind !== "method") continue;
    const methodName = String((member.name as AnyNode | undefined)?.name ?? "");
    if (methodName !== "__construct") continue;
    const args = Array.isArray(member.arguments) ? (member.arguments as AnyNode[]) : [];
    for (const arg of args) {
      const flags = typeof arg.flags === "number" ? arg.flags : 0;
      if ((flags & (1 | 2 | 4)) === 0) continue;
      const propName = String((arg.name as AnyNode | undefined)?.name ?? arg.name ?? "");
      if (!propName) continue;
      const typeHint = typeNameFromHint(arg.type as AnyNode | null);
      const readonly = Boolean(arg.readonly) || (flags & 64) !== 0;
      properties.push({ name: propName, typeHint, readonly });
    }
  }

  if (properties.length > 0) {
    out.push({
      kind: "ClassDecl",
      name: classFqn,
      properties,
      ...(Boolean(classNode.isReadonly) ? { readonly: true as const } : {}),
      pos: pos(file, classNode),
    });
  }

  for (const member of members) {
    if (member.kind !== "method") continue;
    const methodName = String((member.name as AnyNode | undefined)?.name ?? "");
    if (!methodName) continue;
    if (!Boolean(member.isStatic) && methodName !== "__invoke") continue;
    const args = Array.isArray(member.arguments) ? (member.arguments as AnyNode[]) : [];
    const body = member.body as AnyNode | undefined;
    const methodAttributes = convertGlayzzleAttributes(file, member.attrGroups as AnyNode[] | undefined);
    out.push({
      kind: "FunctionDecl",
      name: `${classFqn}::${methodName}`,
      params: args.map((a) => ({
        name: String((a.name as AnyNode | string) instanceof Object ? (a.name as AnyNode).name : a.name ?? ""),
        hint: typeNameFromHint(a.type as AnyNode | null),
        default: a.value ? convertExpression(file, a.value as AnyNode) : null,
      })),
      returnHint: typeNameFromHint(member.type as AnyNode | null),
      body: body?.kind === "block" ? convertBody(file, body.children, nsPrefix) : [],
      ...(methodAttributes.length > 0 ? { attributes: methodAttributes } : {}),
      pos: pos(file, member),
    });
  }
  return out;
}

function convertTopLevelEnumToFunctionDecls(file: string, enumNode: AnyNode, nsPrefix: string): PhpNode[] {
  const shortName = String((enumNode.name as AnyNode)?.name ?? "");
  const declName = shortName !== "" && nsPrefix !== "" ? `${nsPrefix}\\${shortName}` : shortName;
  const valueType = enumNode.valueType as AnyNode | null | undefined;
  let scalarType: "string" | "int" | null = null;
  if (valueType?.kind === "name" || valueType?.kind === "identifier") {
    const vn = String(valueType.name ?? "");
    if (vn === "string" || vn === "int") scalarType = vn;
  }
  const body = Array.isArray(enumNode.body) ? (enumNode.body as AnyNode[]) : [];
  const cases = body
    .filter((c) => c.kind === "enumcase")
    .map((c) => ({
      name: String((c.name as AnyNode)?.name ?? ""),
      value: c.value ? convertExpression(file, c.value as AnyNode) : null,
    }));
  const out: PhpNode[] = [{ kind: "EnumDecl", name: declName, scalarType, cases, pos: pos(file, enumNode) }];
  for (const member of body) {
    if (member.kind !== "method") continue;
    const methodName = String((member.name as AnyNode | undefined)?.name ?? "");
    if (!methodName) continue;
    const args = Array.isArray(member.arguments) ? (member.arguments as AnyNode[]) : [];
    const methodBody = member.body as AnyNode | undefined;
    const methodAttributes = convertGlayzzleAttributes(file, member.attrGroups as AnyNode[] | undefined);
    out.push({
      kind: "FunctionDecl",
      name: `${declName}::${methodName}`,
      params: args.map((a) => ({
        name: String((a.name as AnyNode | string) instanceof Object ? (a.name as AnyNode).name : a.name ?? ""),
        hint: typeNameFromHint(a.type as AnyNode | null),
        default: a.value ? convertExpression(file, a.value as AnyNode) : null,
      })),
      returnHint: typeNameFromHint(member.type as AnyNode | null),
      body: methodBody?.kind === "block" ? convertBody(file, methodBody.children, nsPrefix) : [],
      ...(methodAttributes.length > 0 ? { attributes: methodAttributes } : {}),
      pos: pos(file, member),
    });
  }
  return out;
}

function convertBody(file: string, body: unknown, nsPrefix: string): PhpNode[] {
  if (!Array.isArray(body)) return [];
  return (body as AnyNode[]).map((n) => convertStatement(file, n, nsPrefix));
}

function convertStatement(file: string, node: AnyNode, nsPrefix: string): PhpNode {
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
        return convertStatement(file, inner, nsPrefix);
      }
      if (inner?.kind === "include") {
        return convertStatement(file, inner, nsPrefix);
      }
      if (inner?.kind === "exit" || inner?.kind === "die") {
        return convertStatement(file, inner, nsPrefix);
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
          elseBody = convertBody(file, elseNode.children, nsPrefix);
        } else if (elseNode.kind === "if") {
          elseBody = [convertStatement(file, elseNode, nsPrefix)];
        } else {
          elseBody = [convertStatement(file, elseNode, nsPrefix)];
        }
      }
      const body = node.body as AnyNode | undefined;
      const thenBody =
        body?.kind === "block"
          ? convertBody(file, body.children, nsPrefix)
          : body
            ? [convertStatement(file, body, nsPrefix)]
            : [];
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
      const bodyArr =
        body?.kind === "block"
          ? convertBody(file, body.children, nsPrefix)
          : body
            ? [convertStatement(file, body, nsPrefix)]
            : [];
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
      const shortName = String((node.name as AnyNode)?.name ?? "<anonymous>");
      const declName =
        shortName !== "<anonymous>" && nsPrefix !== "" ? `${nsPrefix}\\${shortName}` : shortName;
      const fnAttributes = convertGlayzzleAttributes(file, node.attrGroups as AnyNode[] | undefined);
      return {
        kind: "FunctionDecl",
        name: declName,
        params: args.map((a) => ({
          name: String((a.name as AnyNode | string) instanceof Object ? (a.name as AnyNode).name : a.name ?? ""),
          hint: typeNameFromHint(a.type as AnyNode | null),
          default: a.value ? convertExpression(file, a.value as AnyNode) : null,
        })),
        returnHint: typeNameFromHint(node.type as AnyNode | null),
        body: body?.kind === "block" ? convertBody(file, body.children, nsPrefix) : [],
        ...(fnAttributes.length > 0 ? { attributes: fnAttributes } : {}),
        pos: pos(file, node),
      };
    }
    case "usegroup":
      // Import side effects are out of scope for the canonical AST; keep position only.
      return { kind: "Noop", pos: pos(file, node) };
    case "enum":
      return unknownStmt(file, node, "nested enum not supported");
    case "throw": {
      const w = node.what as AnyNode | undefined;
      if (!w) {
        return unknownStmt(file, node, "throw: missing value");
      }
      return {
        kind: "Throw",
        expr: convertExpression(file, w),
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
      // Include bound variable names so `authTaggedHoleReason` can tag auth-
      // related statics (e.g. `$csrfToken`) without widening the generic text.
      const vars = Array.isArray(node.variables) ? (node.variables as AnyNode[]) : [];
      const names: string[] = [];
      for (const item of vars) {
        const v = (item as AnyNode).variable as AnyNode | undefined;
        if (v?.kind === "variable") {
          names.push(String(v.name ?? ""));
        }
      }
      const detail =
        names.length > 0
          ? `static variable declaration ($${names.join(", $")})`
          : "static variable declaration";
      return unknownStmt(file, node, detail);
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
  if (hint.kind === "uniontype" && Array.isArray(hint.types)) {
    const parts = (hint.types as AnyNode[])
      .map((part) => typeNameFromHint(part))
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join("|") : null;
  }
  if (hint.kind === "intersectiontype" && Array.isArray(hint.types)) {
    const parts = (hint.types as AnyNode[])
      .map((part) => typeNameFromHint(part))
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join("&") : null;
  }
  if (hint.kind === "nullabletype") {
    const inner = typeNameFromHint(hint.type as AnyNode | null);
    return inner ? `${inner}|null` : "null";
  }
  if (hint.kind === "identifier") return String((hint as AnyNode).name ?? "");
  if (hint.kind === "typereference") return String((hint as AnyNode).name ?? "");
  if (hint.kind === "name") return String((hint as AnyNode).name ?? "");
  return null;
}

function paramsFromGlayzzleArguments(file: string, args: AnyNode[]): Array<{
  name: string;
  hint: string | null;
  default: PhpExpr | null;
}> {
  return args.map((a) => ({
    name: String((a.name as AnyNode)?.name ?? ""),
    hint: typeNameFromHint(a.type as AnyNode | null),
    default: a.value ? convertExpression(file, a.value as AnyNode) : null,
  }));
}

function convertGlayzzleMatchArms(file: string, arms: AnyNode[]): Array<{
  conditions: PhpExpr[];
  isDefault: boolean;
  body: PhpExpr;
}> {
  return arms.map((arm) => {
    const condsRaw = arm.conds;
    const isDefault = condsRaw === null || condsRaw === undefined;
    const conditions = isDefault
      ? []
      : (Array.isArray(condsRaw) ? condsRaw : [condsRaw]).map((c) => convertExpression(file, c as AnyNode));
    return {
      conditions,
      isDefault,
      body: convertExpression(file, arm.body as AnyNode),
    };
  });
}

function convertGlayzzleAttributes(file: string, groups: AnyNode[] | undefined): PhpAttribute[] {
  if (!Array.isArray(groups) || groups.length === 0) return [];
  const out: PhpAttribute[] = [];
  for (const g of groups) {
    const attrs = Array.isArray(g.attrs) ? (g.attrs as AnyNode[]) : [];
    for (const a of attrs) {
      const rawName = String(a.name ?? "");
      const name = rawName.startsWith("\\") ? rawName : `\\${rawName.replace(/^\\+/, "")}`;
      const rawArgs = Array.isArray(a.args) ? (a.args as AnyNode[]) : [];
      out.push({
        kind: "Attribute",
        name,
        args: rawArgs.map((arg) => convertExpression(file, arg)),
        pos: pos(file, a),
      });
    }
  }
  return out;
}

function convertGlayzzleCallArgs(
  file: string,
  args: AnyNode[],
): { values: PhpExpr[]; names?: (string | null)[] } {
  let anyNamed = false;
  const values: PhpExpr[] = [];
  const names: (string | null)[] = [];
  for (const a of args) {
    if (a.kind === "namedargument") {
      anyNamed = true;
      names.push(String(a.name ?? ""));
      values.push(convertExpression(file, a.value as AnyNode));
    } else {
      names.push(null);
      values.push(convertExpression(file, a));
    }
  }
  return anyNamed ? { values, names } : { values };
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
    case "variadicplaceholder":
      return { kind: "VariadicPlaceholder", pos: pos(file, node) };
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
      const callArgs = convertGlayzzleCallArgs(file, args);
      return {
        kind: "Call",
        callee,
        args: callArgs.values,
        ...(callArgs.names ? { argNames: callArgs.names } : {}),
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
    case "new": {
      const what = node.what as AnyNode | undefined;
      if (!what) {
        return unknownExpr(file, node, "new: missing class");
      }
      if (what.kind !== "name") {
        const callArgs = Array.isArray(node.arguments) ? (node.arguments as AnyNode[]) : [];
        return {
          kind: "NewDynamic",
          classExpr: convertExpression(file, what),
          args: callArgs.map((a) => convertExpression(file, a)),
          pos: pos(file, node),
        };
      }
      const className = String((what as AnyNode).name ?? "").replace(/^\\+/, "");
      const callArgs = Array.isArray(node.arguments) ? (node.arguments as AnyNode[]) : [];
      return {
        kind: "New",
        className,
        args: callArgs.map((a) => convertExpression(file, a)),
        pos: pos(file, node),
      };
    }
    case "arrowfunc": {
      const args = Array.isArray(node.arguments) ? (node.arguments as AnyNode[]) : [];
      return {
        kind: "ArrowFunction",
        params: paramsFromGlayzzleArguments(file, args),
        returnHint: typeNameFromHint(node.type as AnyNode | null),
        body: convertExpression(file, node.body as AnyNode),
        pos: pos(file, node),
      };
    }
    case "match": {
      const arms = Array.isArray(node.arms) ? (node.arms as AnyNode[]) : [];
      return {
        kind: "Match",
        subject: convertExpression(file, node.cond as AnyNode),
        arms: convertGlayzzleMatchArms(file, arms),
        pos: pos(file, node),
      };
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
    statements: convertProgramStatements(filename, children, ""),
  };
}
