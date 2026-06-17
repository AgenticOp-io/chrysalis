/**
 * Converts nikic/php-parser JSON (`json_encode`, nodes have `nodeType`) to canonical PhpAst,
 * aligned with `@chrysalis/parser-bridge/providers/glayzzle.ts`.
 */

import {
  SCHEMA_VERSION,
  type PhpAst,
  type PhpAttribute,
  type PhpExpr,
  type PhpNode,
  type Pos,
} from "../schema.js";

type PhpCallCallee =
  | { readonly kind: "name"; readonly name: string }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "expr"; readonly expr: PhpExpr };

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

const PHP_MODIFIER_STATIC = 8;
const PHP_MODIFIER_PUBLIC = 1;
const PHP_MODIFIER_PROTECTED = 2;
const PHP_MODIFIER_PRIVATE = 4;
const PHP_MODIFIER_READONLY = 64;
const PHP_CLASS_FINAL = 32;
const PHP_CLASS_ABSTRACT = 16;
const INCLUDE_ONCE = 2;
const REQUIRE_ONCE = 4;

type NikicDict = { readonly nodeType: string; readonly attributes?: UnknownAttrs } & Record<
  string,
  unknown
>;
type UnknownAttrs = Readonly<Record<string, unknown>>;

function isNikicDict(v: unknown): v is NikicDict {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  return typeof m.nodeType === "string";
}

/** Binary ops; `Expr_BinaryOp_Coalesce` handled as PhpCoalesce, not PhpBinOp. */
const BINOP_BY_NODE_TYPE: Readonly<Record<string, string>> = {
  Expr_BinaryOp_Plus: "+",
  Expr_BinaryOp_Minus: "-",
  Expr_BinaryOp_Mul: "*",
  Expr_BinaryOp_Div: "/",
  Expr_BinaryOp_Concat: ".",
  Expr_BinaryOp_Mod: "%",
  Expr_BinaryOp_Pow: "**",
  Expr_BinaryOp_ShiftLeft: "<<",
  Expr_BinaryOp_ShiftRight: ">>",
  Expr_BinaryOp_BooleanAnd: "&&",
  Expr_BinaryOp_BooleanOr: "||",
  Expr_BinaryOp_LogicalAnd: "and",
  Expr_BinaryOp_LogicalOr: "or",
  Expr_BinaryOp_LogicalXor: "xor",
  Expr_BinaryOp_BitwiseAnd: "&",
  Expr_BinaryOp_BitwiseOr: "|",
  Expr_BinaryOp_BitwiseXor: "^",
  Expr_BinaryOp_Equal: "==",
  Expr_BinaryOp_NotEqual: "!=",
  Expr_BinaryOp_Identical: "===",
  Expr_BinaryOp_NotIdentical: "!==",
  Expr_BinaryOp_Spaceship: "<=>",
  Expr_BinaryOp_Smaller: "<",
  Expr_BinaryOp_SmallerOrEqual: "<=",
  Expr_BinaryOp_Greater: ">",
  Expr_BinaryOp_GreaterOrEqual: ">=",
  Expr_BinaryOp_Pipe: "|>",
};

const MAGIC_CONST_FROM_TYPE: Readonly<Record<string, string>> = {
  Scalar_MagicConst_Dir: "__DIR__",
  Scalar_MagicConst_File: "__FILE__",
  Scalar_MagicConst_Line: "__LINE__",
  Scalar_MagicConst_Function: "__FUNCTION__",
  Scalar_MagicConst_Class: "__CLASS__",
  Scalar_MagicConst_Trait: "__TRAIT__",
  Scalar_MagicConst_Method: "__METHOD__",
  Scalar_MagicConst_Namespace: "__NAMESPACE__",
  Scalar_MagicConst_Property: "__PROPERTY__",
};


function composePhpNamespacePrefix(parentNs: string, declaredName: string): string {
  const d = declaredName.trim();
  if (!d) return parentNs;
  if (!parentNs) return d;
  return `${parentNs}\\${d}`;
}

function attrsLine(a: UnknownAttrs | undefined): number {
  if (!a?.startLine || typeof a.startLine !== "number") return 0;
  return a.startLine;
}

function posFrom(file: string, a: UnknownAttrs | undefined): Pos {
  return { file, line: attrsLine(a), col: 0 };
}

function stmtPos(file: string, raw: NikicDict): Pos {
  return posFrom(file, raw.attributes as UnknownAttrs | undefined);
}

function unknownStmt(file: string, raw: NikicDict | null, detail: string): PhpNode {
  return { kind: "Unknown", detail, pos: raw ? stmtPos(file, raw) : { file, line: 0, col: 0 } };
}

function unknownExpr(file: string, raw: NikicDict | null, detail: string): PhpExpr {
  return { kind: "UnknownExpr", detail, pos: raw ? stmtPos(file, raw) : { file, line: 0, col: 0 } };
}

export function parseNikicJsonRoots(raw: unknown, file: string): PhpAst {
  if (!Array.isArray(raw)) {
    throw new Error("parseNikicJsonRoots: expected JSON array of top-level Stmt nodes");
  }
  const statements = convertProgramStatements(file, raw, "");
  return { schemaVersion: SCHEMA_VERSION, file, statements };
}

function convertProgramStatements(file: string, nodes: unknown[], parentNs: string): PhpNode[] {
  const out: PhpNode[] = [];
  for (const node of nodes) {
    if (!isNikicDict(node)) continue;
    const nt = node.nodeType;
    if (nt === "Stmt_Namespace") {
      const declared = extractNamespaceDeclaredName(node);
      const innerNs = composePhpNamespacePrefix(parentNs, declared);
      const stm = Array.isArray(node.stmts) ? node.stmts : [];
      out.push(...convertProgramStatements(file, stm as unknown[], innerNs));
    } else if (nt === "Stmt_Class") {
      out.push(...convertTopLevelClassToFunctionDecls(file, node, parentNs));
    } else if (nt === "Stmt_Enum") {
      out.push(...convertTopLevelEnumToFunctionDecls(file, node, parentNs));
    } else if (nt === "Stmt_Trait") {
      out.push(...convertTopLevelTraitToFunctionDecls(file, node, parentNs));
    } else if (nt === "Stmt_Interface") {
      out.push(...convertTopLevelInterfaceToFunctionDecls(file, node, parentNs));
    } else {
      out.push(convertStatement(file, node, parentNs));
    }
  }
  return out;
}

function extractNamespaceDeclaredName(node: NikicDict): string {
  const n = node.name;
  if (!n || n === null) return "";
  if (typeof n === "string") return n.trim();
  return isNikicDict(n) && n.nodeType.startsWith("Name") ? nameFromNameNode(n) : "";
}

function nameFromNameNode(raw: NikicDict): string {
  const nm = raw.name;
  if (typeof nm !== "string") return "";
  return nm.startsWith("\\") ? nm.slice(1) : nm;
}

function identifierText(raw: unknown): string | undefined {
  if (!isNikicDict(raw)) return undefined;
  if (raw.nodeType === "Identifier" || raw.nodeType === "VarLikeIdentifier") {
    const nm = raw.name;
    return typeof nm === "string" ? nm : undefined;
  }
  return undefined;
}

function isPromotedConstructorParam(flags: number): boolean {
  return (flags & (PHP_MODIFIER_PUBLIC | PHP_MODIFIER_PROTECTED | PHP_MODIFIER_PRIVATE)) !== 0;
}

function promotedPropertiesFromConstructorParams(
  file: string,
  params: unknown[],
): import("../schema.js").PhpClassProperty[] {
  const out: import("../schema.js").PhpClassProperty[] = [];
  for (const raw of params) {
    if (!isNikicDict(raw) || raw.nodeType !== "Param") continue;
    const flags = typeof raw.flags === "number" ? raw.flags : 0;
    if (!isPromotedConstructorParam(flags)) continue;
    const v = raw.var;
    if (!isNikicDict(v) || v.nodeType !== "Expr_Variable") continue;
    const propName = exprVariableBareName(file, v);
    if (!propName) continue;
    out.push({
      name: propName,
      typeHint: typeHint(raw.type as unknown),
      readonly: (flags & PHP_MODIFIER_READONLY) !== 0,
    });
  }
  return out;
}

function convertTopLevelClassToFunctionDecls(
  file: string,
  classNode: NikicDict,
  nsPrefix: string,
): PhpNode[] {
  const classShort = identifierText(classNode.name) ?? "";
  if (!classShort) return [unknownStmt(file, classNode, "class without name")];

  const fqn = nsPrefix ? `${nsPrefix}\\${classShort}` : classShort;
  const body = Array.isArray(classNode.stmts) ? (classNode.stmts as unknown[]) : [];
  const out: PhpNode[] = [];
  const properties: import("../schema.js").PhpClassProperty[] = [];
  const constants: import("../schema.js").PhpClassConstant[] = [];

  for (const mb of body) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_ClassConst") continue;
    const constsRaw = Array.isArray(mb.consts) ? mb.consts : [];
    for (const c of constsRaw) {
      if (!isNikicDict(c) || c.nodeType !== "Const") continue;
      const cname = identifierText(c.name) ?? "";
      if (!cname) continue;
      constants.push({
        name: cname,
        value: c.value !== undefined && c.value !== null ? mustExpr(file, c.value as unknown) : null,
      });
    }
  }

  for (const mb of body) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_Property") continue;
    const flags = typeof mb.flags === "number" ? mb.flags : 0;
    const readonly = (flags & PHP_MODIFIER_READONLY) !== 0;
    const isStatic = (flags & PHP_MODIFIER_STATIC) !== 0;
    const typeHintText = typeHint(mb.type as unknown);
    const props = Array.isArray(mb.props) ? mb.props : [];
    for (const prop of props) {
      if (!isNikicDict(prop) || prop.nodeType !== "PropertyItem") continue;
      const propNameNode = prop.name;
      const propName =
        isNikicDict(propNameNode) && propNameNode.nodeType === "VarLikeIdentifier"
          ? identifierText(propNameNode) ?? ""
          : "";
      if (!propName) continue;
      properties.push({
        name: propName,
        typeHint: typeHintText,
        readonly,
        ...(isStatic ? { static: true as const } : {}),
      });
    }
  }

  for (const mb of body) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_ClassMethod") continue;
    if (identifierText(mb.name) !== "__construct") continue;
    properties.push(
      ...promotedPropertiesFromConstructorParams(
        file,
        Array.isArray(mb.params) ? mb.params : [],
      ),
    );
  }

  const classFlags = typeof classNode.flags === "number" ? classNode.flags : 0;
  const classMeta = {
    ...((classFlags & PHP_MODIFIER_READONLY) !== 0 ? { readonly: true as const } : {}),
    ...((classFlags & PHP_CLASS_FINAL) !== 0 ? { final: true as const } : {}),
    ...((classFlags & PHP_CLASS_ABSTRACT) !== 0 ? { abstract: true as const } : {}),
  };
  if (properties.length > 0 || constants.length > 0 || Object.keys(classMeta).length > 0) {
    out.push({
      kind: "ClassDecl",
      name: fqn,
      properties,
      ...(constants.length > 0 ? { constants } : {}),
      ...classMeta,
      pos: stmtPos(file, classNode),
    });
  }

  for (const mb of body) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_ClassMethod") continue;
    const flags = typeof mb.flags === "number" ? mb.flags : 0;
    const mname = identifierText(mb.name);
    if (!mname) continue;
    // Static methods are hoisted for call-effect inference; the non-static
    // `__invoke` is also hoisted so invokable controllers can lift the method
    // body as the route handler (ingest `selectRouteHandlerStatements`).
    if ((flags & PHP_MODIFIER_STATIC) === 0 && mname !== "__invoke") continue;

    const pst = Array.isArray(mb.stmts) ? convertBody(file, mb.stmts as unknown[], nsPrefix) : [];
    const params = (Array.isArray(mb.params) ? mb.params : []).map((p) =>
      convertParam(file, p),
    );

    const methodAttributes = convertNikicAttributes(file, mb.attrGroups);

    out.push({
      kind: "FunctionDecl",
      name: `${fqn}::${mname}`,
      params,
      returnHint: typeHint(mb.returnType as unknown),
      body: pst,
      ...(methodAttributes.length > 0 ? { attributes: methodAttributes } : {}),
      pos: stmtPos(file, mb),
    });
  }
  return out;
}

function convertTopLevelEnumToFunctionDecls(
  file: string,
  enumNode: NikicDict,
  nsPrefix: string,
): PhpNode[] {
  const short = identifierText(enumNode.name) ?? "";
  const name = short !== "" && nsPrefix !== "" ? `${nsPrefix}\\${short}` : short;
  const st = typeHint(enumNode.scalarType as unknown);
  const scalarType = st === "string" || st === "int" ? st : null;
  const stmts = Array.isArray(enumNode.stmts) ? enumNode.stmts : [];
  const cases: { name: string; value: PhpExpr | null }[] = [];
  for (const rawCase of stmts) {
    if (!isNikicDict(rawCase) || rawCase.nodeType !== "Stmt_EnumCase") continue;
    const cname = identifierText(rawCase.name) ?? "";
    const expr = rawCase.expr as unknown;
    cases.push({
      name: cname,
      value:
        expr !== undefined && expr !== null && isNikicDict(expr)
          ? convertExpression(file, expr)
          : null,
    });
  }
  const out: PhpNode[] = [{ kind: "EnumDecl", name, scalarType, cases, pos: stmtPos(file, enumNode) }];
  for (const mb of stmts) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_ClassMethod") continue;
    const mname = identifierText(mb.name);
    if (!mname) continue;
    const pst = Array.isArray(mb.stmts) ? convertBody(file, mb.stmts as unknown[], nsPrefix) : [];
    const params = (Array.isArray(mb.params) ? mb.params : []).map((p) => convertParam(file, p));
    const methodAttributes = convertNikicAttributes(file, mb.attrGroups);
    out.push({
      kind: "FunctionDecl",
      name: `${name}::${mname}`,
      params,
      returnHint: typeHint(mb.returnType as unknown),
      body: pst,
      ...(methodAttributes.length > 0 ? { attributes: methodAttributes } : {}),
      pos: stmtPos(file, mb),
    });
  }
  return out;
}

function convertTopLevelTraitToFunctionDecls(
  file: string,
  traitNode: NikicDict,
  nsPrefix: string,
): PhpNode[] {
  const short = identifierText(traitNode.name) ?? "";
  const name = short !== "" && nsPrefix !== "" ? `${nsPrefix}\\${short}` : short;
  const stmts = Array.isArray(traitNode.stmts) ? traitNode.stmts : [];
  const out: PhpNode[] = [];
  for (const mb of stmts) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_ClassMethod") continue;
    const mname = identifierText(mb.name);
    if (!mname) continue;
    const pst = Array.isArray(mb.stmts) ? convertBody(file, mb.stmts as unknown[], nsPrefix) : [];
    const params = (Array.isArray(mb.params) ? mb.params : []).map((p) => convertParam(file, p));
    const methodAttributes = convertNikicAttributes(file, mb.attrGroups);
    out.push({
      kind: "FunctionDecl",
      name: `${name}::${mname}`,
      params,
      returnHint: typeHint(mb.returnType as unknown),
      body: pst,
      ...(methodAttributes.length > 0 ? { attributes: methodAttributes } : {}),
      pos: stmtPos(file, mb),
    });
  }
  return out;
}

function convertTopLevelInterfaceToFunctionDecls(
  file: string,
  ifaceNode: NikicDict,
  nsPrefix: string,
): PhpNode[] {
  const short = identifierText(ifaceNode.name) ?? "";
  const name = short !== "" && nsPrefix !== "" ? `${nsPrefix}\\${short}` : short;
  const stmts = Array.isArray(ifaceNode.stmts) ? ifaceNode.stmts : [];
  const out: PhpNode[] = [];
  for (const mb of stmts) {
    if (!isNikicDict(mb) || mb.nodeType !== "Stmt_ClassMethod") continue;
    const mname = identifierText(mb.name);
    if (!mname) continue;
    const pst = Array.isArray(mb.stmts) ? convertBody(file, mb.stmts as unknown[], nsPrefix) : [];
    const params = (Array.isArray(mb.params) ? mb.params : []).map((p) => convertParam(file, p));
    const methodAttributes = convertNikicAttributes(file, mb.attrGroups);
    out.push({
      kind: "FunctionDecl",
      name: `${name}::${mname}`,
      params,
      returnHint: typeHint(mb.returnType as unknown),
      body: pst,
      ...(methodAttributes.length > 0 ? { attributes: methodAttributes } : {}),
      pos: stmtPos(file, mb),
    });
  }
  return out;
}

interface DeclParam {
  readonly name: string;
  readonly hint: string | null;
  readonly default: PhpExpr | null;
}

function convertParam(file: string, raw: unknown): DeclParam {
  if (!isNikicDict(raw) || raw.nodeType !== "Param") {
    return { name: "", hint: null, default: null };
  }

  let nameStr = "";

  const v = raw.var;
  if (isNikicDict(v) && v.nodeType === "Expr_Variable") {
    nameStr = exprVariableBareName(file, v as NikicDict);
  }

  const def = raw.default;
  const defaultExpr =
    def !== null && def !== undefined && isNikicDict(def) ? convertExpression(file, def) : null;

  return {
    name: nameStr,
    hint: typeHint(raw.type as unknown),
    default: defaultExpr,
  };
}

function typeHint(t: unknown): string | null {
  if (!t || !isNikicDict(t)) return null;
  if (t.nodeType === "Identifier") return identifierText(t) ?? null;
  if (t.nodeType === "UnionType") {
    const types = Array.isArray(t.types) ? t.types : [];
    const parts = types.map((part) => typeHint(part)).filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join("|") : null;
  }
  if (t.nodeType === "NullableType") {
    const inner = typeHint(t.type);
    return inner ? `${inner}|null` : "null";
  }
  if (t.nodeType === "IntersectionType") {
    const types = Array.isArray(t.types) ? t.types : [];
    const parts = types.map((part) => typeHint(part)).filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join("&") : null;
  }
  if (t.nodeType === "Name" || t.nodeType === "Name_FullyQualified" || t.nodeType === "Name_Relative") {
    const s = nameFromNameNode(t);
    return s || null;
  }
  return null;
}

function convertBody(file: string, body: unknown[], nsPrefix: string): PhpNode[] {
  return body.map((n) => convertStatement(file, asNikicStmt(n), nsPrefix));
}

function asNikicStmt(raw: unknown): NikicDict {
  if (!isNikicDict(raw)) {
    throw new Error("parseNikicJsonRoots: statement missing nodeType");
  }
  return raw;
}

function convertStatement(file: string, node: NikicDict, nsPrefix: string): PhpNode {
  switch (node.nodeType) {
    case "Stmt_InlineHTML":
      return {
        kind: "InlineHtml",
        text: typeof node.value === "string" ? node.value : "",
        pos: stmtPos(file, node),
      };

    case "Stmt_Echo": {
      const exprsRaw = Array.isArray(node.exprs) ? node.exprs : [];
      const values = exprsRaw.map((e) => mustExpr(file, e));
      return { kind: "Echo", values, pos: stmtPos(file, node) };
    }

    case "Stmt_Foreach":
      return convertForeach(file, node, nsPrefix);

    case "Stmt_Function": {
      const short = identifierText(node.name) ?? "<anonymous>";
      const name = short !== "<anonymous>" && nsPrefix !== "" ? `${nsPrefix}\\${short}` : short;

      const bodyStmts = Array.isArray(node.stmts) ? (node.stmts as unknown[]) : [];
      const params = (Array.isArray(node.params) ? node.params : []).map((p) =>
        convertParam(file, p),
      );

      const fnAttributes = convertNikicAttributes(file, node.attrGroups);
      return {
        kind: "FunctionDecl",
        name,
        params,
        returnHint: typeHint(node.returnType as unknown),
        body: convertBody(file, bodyStmts, nsPrefix),
        ...(fnAttributes.length > 0 ? { attributes: fnAttributes } : {}),
        pos: stmtPos(file, node),
      };
    }

    case "Stmt_Return": {
      const ex = node.expr as unknown;
      return {
        kind: "Return",
        value: ex === undefined || ex === null ? null : mustExpr(file, ex),
        pos: stmtPos(file, node),
      };
    }

    case "Stmt_If":
      return convertIfStmt(file, node, nsPrefix);

    case "Stmt_Expression":
      return unwrapStmtExpr(file, node, nsPrefix);

    case "Stmt_Use":
    case "Stmt_GroupUse":
      return { kind: "Noop", pos: stmtPos(file, node) };

    case "Stmt_Declare":
      return { kind: "Noop", pos: stmtPos(file, node) };

    case "Stmt_Enum":
      return unknownStmt(file, node, "nested enum not supported");

    case "Stmt_Static":
      return convertStaticDirective(file, node);

    default:
      return unknownStmt(file, node, `unhandled stmt: ${node.nodeType}`);
  }
}

function convertForeach(file: string, node: NikicDict, nsPrefix: string): PhpNode {
  const iterable = mustExpr(file, node.expr);

  const keyVar = node.keyVar as unknown;
  const keyName =
    keyVar !== undefined &&
    keyVar !== null &&
    isNikicDict(keyVar) &&
    keyVar.nodeType === "Expr_Variable"
      ? exprVariableBareName(file, keyVar)
      : null;

  const valVar = node.valueVar as unknown;
  const valueName = isNikicDict(valVar) ? foreachValName(file, valVar) : "_";

  const stm = Array.isArray(node.stmts) ? (node.stmts as unknown[]) : [];

  return {
    kind: "Foreach",
    iterable,
    keyName,
    valueName,
    body: convertBody(file, stm, nsPrefix),
    pos: stmtPos(file, node),
  };
}

function foreachValName(file: string, v: NikicDict): string {
  if (v.nodeType === "Expr_Variable") return exprVariableBareName(file, v);
  return "_";
}

function convertStaticDirective(file: string, node: NikicDict): PhpNode {
  const varsUnknown = Array.isArray(node.vars) ? node.vars : [];
  const names: string[] = [];
  for (const itemUnknown of varsUnknown) {
    if (!isNikicDict(itemUnknown) || itemUnknown.nodeType !== "StaticVar") continue;

    const inner = itemUnknown.var;
    if (isNikicDict(inner) && inner.nodeType === "Expr_Variable") {
      names.push(exprVariableBareName(file, inner));
    }
  }
  const detail =
    names.length > 0 ? `static variable declaration ($${names.join(", $")})` : "static variable declaration";
  return unknownStmt(file, node, detail);
}

function unwrapStmtExpr(file: string, stmt: NikicDict, nsPrefix: string): PhpNode {
  const innerUnknown = stmt.expr as unknown;
  if (!isNikicDict(innerUnknown)) return unknownStmt(file, stmt, "Stmt_Expression expr");

  const inner = innerUnknown;

  if (inner.nodeType === "Expr_Assign") {
    return stmtAssignPlain(file, inner);
  }

  if (inner.nodeType.startsWith("Expr_AssignOp")) {
    const op = compoundOpcode(inner.nodeType);
    if (op) return stmtCompoundAssign(file, inner, op);

    return unknownStmt(file, stmt, `compound assign (${inner.nodeType})`);
  }

  switch (inner.nodeType) {
    case "Expr_Include":
      return convertIncludeStmt(file, inner, nsPrefix);
    case "Expr_Exit":
      return {
        kind: "Exit",
        value: exitExpr(file, inner),
        pos: stmtPos(file, stmt),
      };
    case "Expr_Throw":
      return {
        kind: "Throw",
        expr: mustExpr(file, inner.expr),
        pos: stmtPos(file, stmt),
      };
    default:
      break;
  }

  return {
    kind: "ExpressionStatement",
    expr: convertExpression(file, inner),
    pos: stmtPos(file, stmt),
  };
}

function compoundOpcode(nt: string): "+=" | "-=" | ".=" | "??=" | undefined {
  switch (nt) {
    case "Expr_AssignOp_Plus":
      return "+=";
    case "Expr_AssignOp_Minus":
      return "-=";
    case "Expr_AssignOp_Concat":
      return ".=";
    case "Expr_AssignOp_Coalesce":
      return "??=";
    default:
      return undefined;
  }
}

function stmtAssignPlain(file: string, stmt: NikicDict): PhpNode {
  const L = stmt.var as unknown;
  const R = stmt.expr as unknown;
  if (!isNikicDict(L) || !isNikicDict(R)) return unknownStmt(file, stmt, "Expr_Assign");
  return {
    kind: "Assign",
    operator: "=",
    target: convertExpression(file, L),
    value: convertExpression(file, R),
    pos: stmtPos(file, stmt),
  };
}

function stmtCompoundAssign(file: string, stmt: NikicDict, op: "+=" | "-=" | ".=" | "??="): PhpNode {
  const L = stmt.var as unknown;
  const R = stmt.expr as unknown;
  if (!isNikicDict(L) || !isNikicDict(R)) return unknownStmt(file, stmt, "Expr_AssignOp");

  return {
    kind: "Assign",
    operator: op,
    target: convertExpression(file, L),
    value: convertExpression(file, R),
    pos: stmtPos(file, stmt),
  };
}

function convertIncludeStmt(file: string, node: NikicDict, _nsPrefix: string): PhpNode {
  const ex = node.expr as unknown;
  if (!isNikicDict(ex)) return unknownStmt(file, node, "Expr_Include.expr");
  const ty = typeof node.type === "number" ? node.type : 0;
  const once = ty === INCLUDE_ONCE || ty === REQUIRE_ONCE;
  return {
    kind: "Require",
    once,
    path: convertExpression(file, ex),
    pos: stmtPos(file, node),
  };
}

function exitExpr(file: string, node: NikicDict): PhpExpr | null {
  const e = node.expr as unknown;
  if (e === undefined || e === null) return null;
  return isNikicDict(e) ? convertExpression(file, e) : null;
}

function convertIfStmt(file: string, stmt: NikicDict, nsPrefix: string): PhpNode {
  const cond = mustExpr(file, stmt.cond);
  const thenStmts = Array.isArray(stmt.stmts) ? (stmt.stmts as unknown[]) : [];
  const thenBody = convertBody(file, thenStmts, nsPrefix);

  const elseifsRaw = Array.isArray(stmt.elseifs) ? (stmt.elseifs as unknown[]) : [];
  let chainedElse = convertElseTail(file, stmt.else as unknown, nsPrefix);

  for (let i = elseifsRaw.length - 1; i >= 0; i--) {
    const ei = elseifsRaw[i];
    if (!isNikicDict(ei) || ei.nodeType !== "Stmt_ElseIf") continue;

    const eiThen = Array.isArray(ei.stmts) ? (ei.stmts as unknown[]) : [];

    chainedElse = [
      {
        kind: "If",
        cond: mustExpr(file, ei.cond),
        then: convertBody(file, eiThen, nsPrefix),
        else: chainedElse,
        pos: stmtPos(file, ei),
      },
    ];
  }

  return {
    kind: "If",
    cond,
    then: thenBody,
    else: chainedElse,
    pos: stmtPos(file, stmt),
  };
}

function convertElseTail(file: string, tail: unknown, nsPrefix: string): PhpNode[] | null {
  if (tail === null || tail === undefined) return null;

  if (!isNikicDict(tail)) return [];

  switch (tail.nodeType) {
    case "Stmt_Else": {
      const stm = Array.isArray(tail.stmts) ? (tail.stmts as unknown[]) : [];
      const converted = convertBody(file, stm, nsPrefix);
      return converted.length === 0 ? null : converted;
    }
    default:
      return [convertStatement(file, tail, nsPrefix)];
  }
}

function mustExpr(file: string, e: unknown): PhpExpr {
  if (!isNikicDict(e)) return unknownExpr(file, null, "missing expr");
  return convertExpression(file, e);
}

function exprVariableBareName(_file: string, v: NikicDict): string {
  const nm = v.name as unknown;

  if (typeof nm === "string") return nm;

  if (isNikicDict(nm) && nm.nodeType === "Identifier") {
    const t = identifierText(nm);
    return t ?? "";
  }
  return "";
}

function literalRawFallback(raw: NikicDict, fallback: string): string {
  const attrs = raw.attributes as UnknownAttrs | undefined;
  const rv = attrs?.rawValue;
  return typeof rv === "string" ? rv : fallback;
}

function unaryOpcode(nt: string): "!" | "-" | "+" | "~" | undefined {
  switch (nt) {
    case "Expr_BooleanNot":
      return "!";
    case "Expr_UnaryMinus":
      return "-";
    case "Expr_UnaryPlus":
      return "+";
    case "Expr_BitwiseNot":
      return "~";
    default:
      return undefined;
  }
}

function castKindFromNikic(nt: string): "int" | "float" | "string" | "bool" | "array" | undefined {
  switch (nt) {
    case "Expr_Cast_Int":
      return "int";
    case "Expr_Cast_Double":
      return "float";
    case "Expr_Cast_String":
      return "string";
    case "Expr_Cast_Bool":
      return "bool";
    case "Expr_Cast_Array":
      return "array";
    default:
      return undefined;
  }
}

function convertFuncCallee(file: string, nameNode: unknown): PhpCallCallee {
  if (!isNikicDict(nameNode)) {
    return { kind: "name", name: "" };
  }
  if (
    nameNode.nodeType === "Name" ||
    nameNode.nodeType === "Name_FullyQualified" ||
    nameNode.nodeType === "Name_Relative"
  ) {
    return { kind: "name", name: nameFromNameNode(nameNode) };
  }
  if (nameNode.nodeType === "Expr_Variable") {
    return { kind: "variable", name: exprVariableBareName(file, nameNode) };
  }
  return { kind: "expr", expr: convertExpression(file, nameNode) };
}

function propertyLikeName(nm: unknown): string | undefined {
  if (typeof nm === "string") return nm;
  if (!isNikicDict(nm)) return undefined;
  if (nm.nodeType === "Identifier") return identifierText(nm) ?? undefined;
  if (nm.nodeType === "VarLikeIdentifier") return identifierText(nm) ?? undefined;
  return undefined;
}

function classFqnForStaticLike(classPart: NikicDict): string | undefined {
  if (classPart.nodeType === "Identifier") {
    const s = identifierText(classPart);
    if (s === "self" || s === "static" || s === "parent") return "";
    return s;
  }
  if (
    classPart.nodeType === "Name" ||
    classPart.nodeType === "Name_FullyQualified" ||
    classPart.nodeType === "Name_Relative"
  ) {
    const s = nameFromNameNode(classPart);
    if (s === "self" || s === "static" || s === "parent") return "";
    return s || undefined;
  }
  return undefined;
}

function instanceofRightExpr(file: string, classRaw: unknown, pos: Pos): PhpExpr {
  if (!isNikicDict(classRaw)) {
    return unknownExpr(file, classRaw as NikicDict, "Expr_Instanceof.class");
  }
  if (
    classRaw.nodeType === "Name" ||
    classRaw.nodeType === "Name_FullyQualified" ||
    classRaw.nodeType === "Name_Relative"
  ) {
    return { kind: "ConstFetch", name: nameFromNameNode(classRaw), pos };
  }
  return convertExpression(file, classRaw);
}

function foldConcatDot(parts: PhpExpr[], pos: Pos): PhpExpr {
  if (parts.length === 0) {
    return { kind: "Literal", literalKind: "string", value: "", raw: '""', pos };
  }
  let acc = parts[0]!;
  for (let i = 1; i < parts.length; i++) {
    acc = { kind: "BinOp", operator: ".", left: acc, right: parts[i]!, pos };
  }
  return acc;
}

function argsFromNikic(
  file: string,
  raw: unknown[],
): { values: PhpExpr[]; names?: (string | null)[] } {
  const values: PhpExpr[] = [];
  const names: (string | null)[] = [];
  let anyNamed = false;
  for (const rawArg of raw) {
    if (!isNikicDict(rawArg)) continue;
    if (rawArg.nodeType === "VariadicPlaceholder") {
      values.push({ kind: "VariadicPlaceholder", pos: stmtPos(file, rawArg) });
      names.push(null);
      continue;
    }
    if (rawArg.nodeType !== "Arg") continue;
    const argName = rawArg.name;
    const label =
      isNikicDict(argName) && argName.nodeType === "Identifier"
        ? identifierText(argName) ?? null
        : null;
    if (label !== null) anyNamed = true;
    names.push(label);
    const v = rawArg.value as unknown;
    if (isNikicDict(v)) values.push(convertExpression(file, v));
  }
  return anyNamed ? { values, names } : { values };
}

function convertNikicAttributes(file: string, groups: unknown): PhpAttribute[] {
  if (!Array.isArray(groups) || groups.length === 0) return [];
  const out: PhpAttribute[] = [];
  for (const g of groups) {
    if (!isNikicDict(g) || g.nodeType !== "AttributeGroup") continue;
    const attrs = Array.isArray(g.attrs) ? g.attrs : [];
    for (const a of attrs) {
      if (!isNikicDict(a) || a.nodeType !== "Attribute") continue;
      const nameNode = a.name;
      let name = "";
      if (isNikicDict(nameNode)) {
        if (nameNode.nodeType.startsWith("Name")) {
          name = nameFromNameNode(nameNode);
        } else if (nameNode.nodeType === "Identifier") {
          name = identifierText(nameNode) ?? "";
        }
      }
      const fqn = name.startsWith("\\") ? name : `\\${name.replace(/^\\+/, "")}`;
      const argPack = argsFromNikic(file, Array.isArray(a.args) ? a.args : []);
      out.push({
        kind: "Attribute",
        name: fqn,
        args: argPack.values,
        pos: stmtPos(file, a),
      });
    }
  }
  return out;
}

function argsFromNikicValuesOnly(file: string, raw: unknown[]): PhpExpr[] {
  return argsFromNikic(file, raw).values;
}

function convertInterpolatedString(file: string, raw: NikicDict): PhpExpr {
  const pos = stmtPos(file, raw);
  const rawParts = Array.isArray(raw.parts) ? raw.parts : [];
  const chunks: PhpExpr[] = [];

  for (const p of rawParts) {
    if (!isNikicDict(p)) continue;
    if (p.nodeType === "InterpolatedStringPart") {
      const pv = typeof p.value === "string" ? p.value : "";
      chunks.push({
        kind: "Literal",
        literalKind: "string",
        value: pv,
        raw: literalRawFallback(p, JSON.stringify(pv)),
        pos: stmtPos(file, p),
      });
    } else {
      chunks.push(convertExpression(file, p));
    }
  }
  return foldConcatDot(chunks, pos);
}

function convertExpression(file: string, raw: NikicDict): PhpExpr {
  const pos = stmtPos(file, raw);
  const nt = raw.nodeType;

  if (MAGIC_CONST_FROM_TYPE[nt]) {
    const name = MAGIC_CONST_FROM_TYPE[nt]!;
    return { kind: "ConstFetch", name, pos };
  }

  if (nt === "Expr_Include") {
    const exUnknown = raw.expr as unknown;
    const ty = typeof raw.type === "number" ? raw.type : 0;
    const once = ty === INCLUDE_ONCE || ty === REQUIRE_ONCE;
    if (!isNikicDict(exUnknown)) return unknownExpr(file, raw, "Expr_Include.expr");
    return {
      kind: "Call",
      callee: { kind: "name", name: once ? "__require_once" : "__require" },
      args: [convertExpression(file, exUnknown)],
      pos,
    };
  }

  if (nt === "Expr_BinaryOp_Coalesce") {
    return {
      kind: "Coalesce",
      left: mustExpr(file, raw.left as unknown),
      right: mustExpr(file, raw.right as unknown),
      pos,
    };
  }

  const binop = BINOP_BY_NODE_TYPE[nt];
  if (binop !== undefined) {
    return {
      kind: "BinOp",
      operator: binop,
      left: mustExpr(file, raw.left as unknown),
      right: mustExpr(file, raw.right as unknown),
      pos,
    };
  }

  const unaryOp = unaryOpcode(nt);
  if (unaryOp !== undefined) {
    return {
      kind: "UnaryOp",
      operator: unaryOp,
      operand: mustExpr(file, raw.expr as unknown),
      pos,
    };
  }

  const castKind = castKindFromNikic(nt);
  if (castKind !== undefined) {
    return {
      kind: "Cast",
      castKind,
      expr: mustExpr(file, raw.expr as unknown),
      pos,
    };
  }

  if (nt === "Expr_PostInc" || nt === "Expr_PreInc") {
    return {
      kind: "UnaryOp",
      operator: "+",
      operand: mustExpr(file, raw.var as unknown),
      pos,
    };
  }

  switch (nt) {
    case "Scalar_String": {
      const v = typeof raw.value === "string" ? raw.value : "";
      return {
        kind: "Literal",
        literalKind: "string",
        value: v,
        raw: literalRawFallback(raw, JSON.stringify(v)),
        pos,
      };
    }

    case "Scalar_Int": {
      const n = typeof raw.value === "number" ? raw.value : Number(raw.value);
      const rn = literalRawFallback(raw, String(n));
      return {
        kind: "Literal",
        literalKind: Number.isFinite(n) && Number.isInteger(n) ? "int" : "float",
        value: Number.isFinite(n) ? Math.trunc(n) : 0,
        raw: rn,
        pos,
      };
    }

    case "Scalar_Float": {
      const n =
        typeof raw.value === "number" ? raw.value : typeof raw.value === "string" ? Number.parseFloat(raw.value) : NaN;
      const num = Number.isFinite(n) ? n : 0;
      const rn = literalRawFallback(raw, String(num));
      return {
        kind: "Literal",
        literalKind: "float",
        value: num,
        raw: rn,
        pos,
      };
    }

    case "Scalar_InterpolatedString":
      return convertInterpolatedString(file, raw);

    case "Expr_Variable": {
      const bare = exprVariableBareName(file, raw);
      if (SUPERGLOBAL_NAMES.has(bare)) {
        return {
          kind: "Superglobal",
          name: bare as
            | "_GET"
            | "_POST"
            | "_SESSION"
            | "_COOKIE"
            | "_SERVER"
            | "_REQUEST"
            | "_ENV"
            | "_FILES"
            | "GLOBALS",
          pos,
        };
      }
      return { kind: "Variable", name: bare, pos };
    }

    case "Expr_PropertyFetch": {
      const vn = raw.var as unknown;
      const prop = raw.name as unknown;
      const pstr = propertyLikeName(prop);
      if (!isNikicDict(vn) || pstr === undefined) {
        return unknownExpr(file, raw, "Expr_PropertyFetch (dynamic)");
      }
      return {
        kind: "PropertyFetch",
        target: convertExpression(file, vn),
        name: pstr,
        pos,
      };
    }

    case "Expr_ClassConstFetch": {
      const c = raw.class as unknown;
      const n = raw.name as unknown;
      const constName = propertyLikeName(n);
      if (!isNikicDict(c) || !constName) {
        return unknownExpr(file, raw, "Expr_ClassConstFetch");
      }
      const cn = classFqnForStaticLike(c);
      if (cn !== undefined) {
        return { kind: "StaticFetch", className: cn, name: constName, pos };
      }
      if (c.nodeType === "Expr_Variable" && constName === "class") {
        return { kind: "StaticFetch", className: exprVariableBareName(file, c), name: "class", pos };
      }
      return unknownExpr(file, raw, "Expr_ClassConstFetch: non-name class");
    }

    case "Expr_StaticPropertyFetch": {
      const c = raw.class as unknown;
      const n = raw.name as unknown;
      const propName = propertyLikeName(n);
      if (!isNikicDict(c) || !propName) {
        return unknownExpr(file, raw, "Expr_StaticPropertyFetch");
      }
      const cn = classFqnForStaticLike(c);
      if (cn === undefined) {
        return unknownExpr(file, raw, "Expr_StaticPropertyFetch: non-name class");
      }
      return { kind: "StaticFetch", className: cn, name: propName, pos };
    }

    case "Expr_ConstFetch": {
      const nmUnknown = raw.name as unknown;
      if (
        !isNikicDict(nmUnknown) ||
        (nmUnknown.nodeType !== "Name" &&
          nmUnknown.nodeType !== "Name_FullyQualified" &&
          nmUnknown.nodeType !== "Name_Relative")
      ) {
        return unknownExpr(file, raw, "Expr_ConstFetch.name");
      }
      const nameStr = nameFromNameNode(nmUnknown);
      // Align with glayzzle `null` / `true` / `false` keyword literals (not bare const fetch).
      if (nameStr === "null") {
        return { kind: "Literal", literalKind: "null", value: null, raw: "null", pos };
      }
      if (nameStr === "true") {
        return { kind: "Literal", literalKind: "bool", value: true, raw: "true", pos };
      }
      if (nameStr === "false") {
        return { kind: "Literal", literalKind: "bool", value: false, raw: "false", pos };
      }
      return {
        kind: "ConstFetch",
        name: nameStr,
        pos,
      };
    }

    case "Expr_ArrayDimFetch": {
      const vTarget = raw.var as unknown;
      const dimUnknown = raw.dim as unknown;
      const dimExpr =
        dimUnknown === undefined || dimUnknown === null
          ? { kind: "Literal" as const, literalKind: "null" as const, value: null, raw: "null", pos }
          : mustExpr(file, dimUnknown);
      if (!isNikicDict(vTarget)) {
        return unknownExpr(file, raw, "Expr_ArrayDimFetch.var");
      }
      return {
        kind: "ArrayAccess",
        target: convertExpression(file, vTarget),
        index: dimExpr,
        pos,
      };
    }

    case "Expr_Array": {
      const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
      const items: Array<{ key: PhpExpr | null; value: PhpExpr }> = [];
      for (const itUnknown of itemsRaw) {
        if (!isNikicDict(itUnknown) || itUnknown.nodeType !== "ArrayItem") continue;
        if (typeof itUnknown.unpack === "boolean" && itUnknown.unpack) {
          items.push({
            key: null,
            value: unknownExpr(file, itUnknown, "array unpack"),
          });
          continue;
        }
        const val = mustExpr(file, itUnknown.value as unknown);
        const k = itUnknown.key as unknown;
        const key = k !== undefined && k !== null && isNikicDict(k) ? convertExpression(file, k) : null;
        items.push({ key, value: val });
      }
      return { kind: "Array", items, pos };
    }

    case "Expr_Assign":
      return {
        kind: "Call",
        callee: { kind: "name", name: "__assign_expr" },
        args: [mustExpr(file, raw.var as unknown), mustExpr(file, raw.expr as unknown)],
        pos,
      };

    case "Expr_New": {
      const clazzUnknown = (raw as Record<string, unknown>)["class"];
      if (!isNikicDict(clazzUnknown)) return unknownExpr(file, raw, "Expr_New: missing class");
      const ct = clazzUnknown.nodeType;
      if (ct !== "Name" && ct !== "Name_FullyQualified" && ct !== "Name_Relative") {
        if (ct === "Stmt_Class") {
          return unknownExpr(file, raw, "Expr_New anonymous class");
        }
        const args = argsFromNikicValuesOnly(file, Array.isArray(raw.args) ? raw.args : []);
        return {
          kind: "NewDynamic",
          classExpr: convertExpression(file, clazzUnknown),
          args,
          pos,
        };
      }
      const className = nameFromNameNode(clazzUnknown).replace(/^\\+/, "") || "?";
      const args = argsFromNikicValuesOnly(file, Array.isArray(raw.args) ? raw.args : []);
      return { kind: "New", className, args, pos };
    }

    case "Expr_Ternary": {
      const midRaw = (raw as Record<string, unknown>)["if"];
      const thenPart =
        midRaw !== undefined && midRaw !== null && isNikicDict(midRaw) ? convertExpression(file, midRaw) : null;
      return {
        kind: "Ternary",
        cond: mustExpr(file, raw.cond as unknown),
        then: thenPart,
        else: mustExpr(file, raw.else as unknown),
        pos,
      };
    }

    case "Expr_FuncCall": {
      const callee = convertFuncCallee(file, raw.name as unknown);
      const argPack = argsFromNikic(file, Array.isArray(raw.args) ? raw.args : []);
      return {
        kind: "Call",
        callee,
        args: argPack.values,
        ...(argPack.names ? { argNames: argPack.names } : {}),
        pos,
      };
    }

    case "Expr_MethodCall": {
      const v = raw.var as unknown;
      const method = propertyLikeName(raw.name as unknown);
      if (!isNikicDict(v) || method === undefined) {
        return unknownExpr(file, raw, "Expr_MethodCall");
      }
      const argPack = argsFromNikic(file, Array.isArray(raw.args) ? raw.args : []);
      return {
        kind: "Call",
        callee: {
          kind: "expr",
          expr: {
            kind: "PropertyFetch",
            target: convertExpression(file, v),
            name: method,
            pos,
          },
        },
        args: argPack.values,
        ...(argPack.names ? { argNames: argPack.names } : {}),
        pos,
      };
    }

    case "Expr_StaticCall": {
      const cls = raw.class as unknown;
      const method = propertyLikeName(raw.name as unknown);
      const fq = isNikicDict(cls) ? classFqnForStaticLike(cls) : undefined;
      const argPack = argsFromNikic(file, Array.isArray(raw.args) ? raw.args : []);
      if (fq !== undefined && method !== undefined) {
        const callee: PhpCallCallee =
          fq === ""
            ? {
                kind: "expr",
                expr: { kind: "StaticFetch", className: "", name: method, pos },
              }
            : { kind: "name", name: `${fq}::${method}` };
        return {
          kind: "Call",
          callee,
          args: argPack.values,
          ...(argPack.names ? { argNames: argPack.names } : {}),
          pos,
        };
      }
      const callee: PhpCallCallee = {
        kind: "expr",
        expr: unknownExpr(
          file,
          raw,
          method === undefined ? "Expr_StaticCall: dynamic method" : "Expr_StaticCall: non-name class",
        ),
      };
      return {
        kind: "Call",
        callee,
        args: argPack.values,
        ...(argPack.names ? { argNames: argPack.names } : {}),
        pos,
      };
    }

    case "Expr_Empty":
      return {
        kind: "Call",
        callee: { kind: "name", name: "__empty" },
        args: [mustExpr(file, raw.expr as unknown)],
        pos,
      };

    case "Expr_Isset": {
      const vars = Array.isArray(raw.vars) ? raw.vars : [];
      return {
        kind: "Call",
        callee: { kind: "name", name: "__isset" },
        args: vars.map((v) => mustExpr(file, v)),
        pos,
      };
    }

    case "Expr_Clone":
      return unknownExpr(file, raw, "unhandled expr: clone");

    case "Expr_Instanceof": {
      return {
        kind: "BinOp",
        operator: "instanceof",
        left: mustExpr(file, raw.expr as unknown),
        right: instanceofRightExpr(file, raw.class, pos),
        pos,
      };
    }

    case "Expr_List":
      return unknownExpr(file, raw, "unhandled expr: list");

    case "Expr_Throw":
      return unknownExpr(file, raw, "unhandled expr: throw");

    case "Expr_ArrowFunction": {
      const params = (Array.isArray(raw.params) ? raw.params : []).map((p) => convertParam(file, p));
      return {
        kind: "ArrowFunction",
        params,
        returnHint: typeHint(raw.returnType as unknown),
        body: mustExpr(file, raw.expr as unknown),
        pos,
      };
    }

    case "Expr_Match": {
      const armsRaw = Array.isArray(raw.arms) ? raw.arms : [];
      const arms = armsRaw.map((arm) => {
        if (!isNikicDict(arm) || arm.nodeType !== "MatchArm") {
          return { conditions: [] as PhpExpr[], isDefault: true, body: unknownExpr(file, null, "MatchArm") };
        }
        const condsRaw = arm.conds;
        const isDefault = condsRaw === null || condsRaw === undefined;
        const conditions = isDefault
          ? []
          : (Array.isArray(condsRaw) ? condsRaw : [condsRaw]).map((c) => mustExpr(file, c));
        return {
          conditions,
          isDefault,
          body: mustExpr(file, arm.body as unknown),
        };
      });
      return {
        kind: "Match",
        subject: mustExpr(file, raw.cond as unknown),
        arms,
        pos,
      };
    }

    default:
      return unknownExpr(file, raw, `unhandled expr: ${nt}`);
  }
}