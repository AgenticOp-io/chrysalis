/**
 * Canonical PHP AST JSON schema. Produced by any parser-bridge provider.
 *
 * Only the subset of PHP syntax actually encountered in fixtures is modeled
 * here. Unknown kinds are allowed via `PhpNodeUnknown` so we fail gracefully
 * with a hole rather than a crash. This schema is versioned; changes require
 * regenerating golden fixtures.
 */

export const SCHEMA_VERSION = "0.1.4";

export type Pos = {
  readonly file: string;
  readonly line: number;
  readonly col: number;
};

export type PhpAst = {
  readonly schemaVersion: string;
  readonly file: string;
  readonly statements: ReadonlyArray<PhpNode>;
};

export type PhpNode =
  | PhpInlineHtml
  | PhpEcho
  | PhpExpressionStatement
  | PhpAssign
  | PhpIf
  | PhpForeach
  | PhpReturn
  | PhpRequire
  | PhpFunctionDecl
  | PhpExit
  | PhpThrow
  | PhpNoop
  | PhpNodeUnknown;

/** Statement that lowers to nothing (e.g. `declare(strict_types=1);`). */
export interface PhpNoop {
  readonly kind: "Noop";
  readonly pos: Pos;
}

export type PhpExpr =
  | PhpLiteral
  | PhpVariable
  | PhpArrayAccess
  | PhpSuperglobal
  | PhpBinOp
  | PhpUnaryOp
  | PhpTernary
  | PhpCoalesce
  | PhpCall
  | PhpArray
  | PhpCast
  | PhpConstFetch
  | PhpStaticFetch
  | PhpPropertyFetch
  | PhpNew
  | PhpNewDynamic
  | PhpExprUnknown;

export interface PhpInlineHtml {
  readonly kind: "InlineHtml";
  readonly text: string;
  readonly pos: Pos;
}

export interface PhpEcho {
  readonly kind: "Echo";
  readonly values: ReadonlyArray<PhpExpr>;
  readonly pos: Pos;
}

export interface PhpExpressionStatement {
  readonly kind: "ExpressionStatement";
  readonly expr: PhpExpr;
  readonly pos: Pos;
}

export interface PhpAssign {
  readonly kind: "Assign";
  readonly operator: "=" | "+=" | "-=" | ".=" | "??=";
  readonly target: PhpExpr;
  readonly value: PhpExpr;
  readonly pos: Pos;
}

export interface PhpIf {
  readonly kind: "If";
  readonly cond: PhpExpr;
  readonly then: ReadonlyArray<PhpNode>;
  readonly else: ReadonlyArray<PhpNode> | null;
  readonly pos: Pos;
}

export interface PhpForeach {
  readonly kind: "Foreach";
  readonly iterable: PhpExpr;
  readonly keyName: string | null;
  readonly valueName: string;
  readonly body: ReadonlyArray<PhpNode>;
  readonly pos: Pos;
}

export interface PhpReturn {
  readonly kind: "Return";
  readonly value: PhpExpr | null;
  readonly pos: Pos;
}

export interface PhpRequire {
  readonly kind: "Require";
  readonly once: boolean;
  readonly path: PhpExpr;
  readonly pos: Pos;
}

export interface PhpFunctionDecl {
  readonly kind: "FunctionDecl";
  readonly name: string;
  readonly params: ReadonlyArray<{ name: string; hint: string | null; default: PhpExpr | null }>;
  readonly returnHint: string | null;
  readonly body: ReadonlyArray<PhpNode>;
  readonly pos: Pos;
}

export interface PhpExit {
  readonly kind: "Exit";
  readonly value: PhpExpr | null;
  readonly pos: Pos;
}

/** `throw` statement (PHP 7+ / expression-throw in PHP 8+). */
export interface PhpThrow {
  readonly kind: "Throw";
  /** Thrown value (commonly `new` or a variable). */
  readonly expr: PhpExpr;
  readonly pos: Pos;
}

/**
 * `new ClassName(args…)`; class name is the PHP parser's resolved `name` string
 * (may include `\\` for FQN — ingest may lower to a hole for multi-segment names).
 */
export interface PhpNew {
  readonly kind: "New";
  readonly className: string;
  readonly args: ReadonlyArray<PhpExpr>;
  readonly pos: Pos;
}

/** `new $x(...)` / computed-class `new` target expression. */
export interface PhpNewDynamic {
  readonly kind: "NewDynamic";
  readonly classExpr: PhpExpr;
  readonly args: ReadonlyArray<PhpExpr>;
  readonly pos: Pos;
}

export interface PhpNodeUnknown {
  readonly kind: "Unknown";
  readonly detail: string;
  readonly pos: Pos;
}

export interface PhpLiteral {
  readonly kind: "Literal";
  readonly literalKind: "string" | "int" | "float" | "bool" | "null";
  readonly value: string | number | boolean | null;
  readonly raw: string;
  readonly pos: Pos;
}

export interface PhpVariable {
  readonly kind: "Variable";
  readonly name: string;
  readonly pos: Pos;
}

export interface PhpArrayAccess {
  readonly kind: "ArrayAccess";
  readonly target: PhpExpr;
  readonly index: PhpExpr;
  readonly pos: Pos;
}

export interface PhpSuperglobal {
  readonly kind: "Superglobal";
  readonly name: "_GET" | "_POST" | "_SESSION" | "_COOKIE" | "_SERVER" | "_REQUEST" | "_ENV" | "_FILES" | "GLOBALS";
  readonly pos: Pos;
}

export interface PhpBinOp {
  readonly kind: "BinOp";
  readonly operator: string;
  readonly left: PhpExpr;
  readonly right: PhpExpr;
  readonly pos: Pos;
}

export interface PhpUnaryOp {
  readonly kind: "UnaryOp";
  readonly operator: "!" | "-" | "+" | "~";
  readonly operand: PhpExpr;
  readonly pos: Pos;
}

export interface PhpTernary {
  readonly kind: "Ternary";
  readonly cond: PhpExpr;
  readonly then: PhpExpr | null;
  readonly else: PhpExpr;
  readonly pos: Pos;
}

export interface PhpCoalesce {
  readonly kind: "Coalesce";
  readonly left: PhpExpr;
  readonly right: PhpExpr;
  readonly pos: Pos;
}

export interface PhpCall {
  readonly kind: "Call";
  readonly callee:
    | { kind: "name"; name: string }
    | { kind: "variable"; name: string }
    | { kind: "expr"; expr: PhpExpr };
  readonly args: ReadonlyArray<PhpExpr>;
  readonly pos: Pos;
}

export interface PhpArray {
  readonly kind: "Array";
  readonly items: ReadonlyArray<{ key: PhpExpr | null; value: PhpExpr }>;
  readonly pos: Pos;
}

export interface PhpCast {
  readonly kind: "Cast";
  readonly castKind: "int" | "float" | "string" | "bool" | "array";
  readonly expr: PhpExpr;
  readonly pos: Pos;
}

export interface PhpConstFetch {
  readonly kind: "ConstFetch";
  readonly name: string;
  readonly pos: Pos;
}

export interface PhpStaticFetch {
  readonly kind: "StaticFetch";
  readonly className: string;
  readonly name: string;
  readonly pos: Pos;
}

export interface PhpPropertyFetch {
  readonly kind: "PropertyFetch";
  readonly target: PhpExpr;
  readonly name: string;
  readonly pos: Pos;
}

export interface PhpExprUnknown {
  readonly kind: "UnknownExpr";
  readonly detail: string;
  readonly pos: Pos;
}
