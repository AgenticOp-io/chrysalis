/**
 * `data` dialect — pure, effect-free dataflow. SSA-style; every node produces
 * a single value and has no side effects (effects live in the `effect`
 * dialect).
 */
import type { Locator, NodeId, Provenance, WebIRType } from "../index.js";
import { type ModuleBuilder, provenance } from "../builder.js";

export const DIALECT = "data" as const;

export interface Builders {
  literal(opts: {
    value: string | number | boolean | null;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  param(opts: {
    name: string;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  requestField(opts: {
    source: "query" | "body" | "path" | "header" | "cookie";
    name: string;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  binOp(opts: {
    operator: "&&" | "||" | "==" | "===" | "!=" | "!==" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/" | "." | "??";
    left: NodeId;
    right: NodeId;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  unaryOp(opts: {
    operator: "!" | "-" | "+" | "isset" | "empty";
    operand: NodeId;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  member(opts: {
    obj: NodeId;
    key: string | NodeId;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  call(opts: {
    callee: string;
    args: ReadonlyArray<NodeId>;
    /** Parallel to `args` when any PHP argument was named; `null` = positional. */
    argNames?: ReadonlyArray<string | null>;
    /** PHP 8 attributes from the resolved callee `FunctionDecl`. */
    phpAttributes?: ReadonlyArray<{ readonly name: string; readonly args: ReadonlyArray<unknown> }>;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  concat(opts: {
    parts: ReadonlyArray<NodeId>;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  htmlTemplate(opts: {
    /** Mixed literal HTML and interpolations. `literal` is string; `expr` is NodeId. */
    parts: ReadonlyArray<{ kind: "literal"; text: string } | { kind: "expr"; node: NodeId; escape: boolean }>;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  uiTree(opts: {
    /** Serialised element/text tree (RFC-0017). Dynamic slots reference `operands`. */
    nodes: unknown;
    operands?: ReadonlyArray<NodeId>;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  block(opts: {
    statements: ReadonlyArray<NodeId>;
    type?: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  ifElse(opts: {
    cond: NodeId;
    then: NodeId;
    else?: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  foreach(opts: {
    iterable: NodeId;
    keyName?: string;
    valueName: string;
    body: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  hole(opts: {
    reason: string;
    input: WebIRType;
    output: WebIRType;
    operands?: ReadonlyArray<NodeId>;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
}

export function builders(m: ModuleBuilder): Builders {
  return {
    literal({ value, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "literal",
        type,
        effects: [],
        operands: [],
        attrs: { value },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `literal ${String(value)}`)],
      });
    },
    param({ name, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "param",
        type,
        effects: [],
        operands: [],
        attrs: { name },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `param ${name}`)],
      });
    },
    requestField({ source, name, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "request.field",
        type,
        effects: [],
        operands: [],
        attrs: { source, name },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `$_${source.toUpperCase()}['${name}']`)],
      });
    },
    binOp({ operator, left, right, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "binop",
        type,
        effects: [],
        operands: [left, right],
        attrs: { operator },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `binop ${operator}`)],
      });
    },
    unaryOp({ operator, operand, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "unaryop",
        type,
        effects: [],
        operands: [operand],
        attrs: { operator },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `unary ${operator}`)],
      });
    },
    member({ obj, key, type, origin, provenance: prov }) {
      const operands = typeof key === "string" ? [obj] : [obj, key];
      return m.node({
        dialect: DIALECT,
        op: "member",
        type,
        effects: [],
        operands,
        attrs: typeof key === "string" ? { key } : {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `member ${String(key)}`)],
      });
    },
    call({ callee, args, argNames, phpAttributes, type, origin, provenance: prov }) {
      const attrs: {
        callee: string;
        argNames?: ReadonlyArray<string | null>;
        phpAttributes?: ReadonlyArray<{ readonly name: string; readonly args: ReadonlyArray<unknown> }>;
      } = { callee };
      if (argNames !== undefined) attrs.argNames = argNames;
      if (phpAttributes !== undefined) attrs.phpAttributes = phpAttributes;
      return m.node({
        dialect: DIALECT,
        op: "call",
        type,
        effects: [],
        operands: args,
        attrs,
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `call ${callee}`)],
      });
    },
    concat({ parts, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "concat",
        type: { kind: "string" },
        effects: [],
        operands: parts,
        attrs: {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "concat")],
      });
    },
    htmlTemplate({ parts, origin, provenance: prov }) {
      const operands: NodeId[] = [];
      const serialisable = parts.map((p) => {
        if (p.kind === "literal") return { kind: "literal" as const, text: p.text };
        operands.push(p.node);
        return {
          kind: "expr" as const,
          idx: operands.length - 1,
          escape: p.escape,
        };
      });
      return m.node({
        dialect: DIALECT,
        op: "html.template",
        type: { kind: "string" },
        effects: [],
        operands,
        attrs: { parts: serialisable },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "html template")],
      });
    },
    uiTree({ nodes, operands = [], origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "ui.tree",
        type: { kind: "string" },
        effects: [],
        operands,
        attrs: { nodes },
        origin,
        provenance: prov ?? [provenance("hub-ingest", origin, "cwl ui tree")],
      });
    },
    block({ statements, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "block",
        type: type ?? { kind: "void" },
        effects: [],
        operands: statements,
        attrs: {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "block")],
      });
    },
    ifElse({ cond, then, else: el, origin, provenance: prov }) {
      const operands = el !== undefined ? [cond, then, el] : [cond, then];
      return m.node({
        dialect: DIALECT,
        op: "if",
        type: { kind: "void" },
        effects: [],
        operands,
        attrs: { hasElse: el !== undefined },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "if")],
      });
    },
    foreach({ iterable, keyName, valueName, body, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "foreach",
        type: { kind: "void" },
        effects: [],
        operands: [iterable, body],
        attrs: { keyName: keyName ?? null, valueName },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "foreach")],
      });
    },
    hole({ reason, input, output, operands = [], origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "hole",
        type: { kind: "hole", contract: { input, output } },
        effects: [],
        operands,
        attrs: { reason },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `hole: ${reason}`)],
      });
    },
  };
}
