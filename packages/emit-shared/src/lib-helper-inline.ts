/**
 * Emit-time inlining and lowered lib helper modules (mirrors ingest B5.5, G2318).
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { stringLit, ident } from "./ts-util.js";

export interface EmitInlineCtx {
  readonly m: Module;
  readonly domainTypesByTable?: Readonly<Record<string, string>>;
  readonly domainTypeImports: Set<string>;
  readonly effectNames: Set<string>;
  emitParamExpr: (paramNodeId: NodeId, subst: Readonly<Record<string, string>>) => string;
}

function getNode(m: Module, id: NodeId): NodeBase | undefined {
  return m.nodes.get(id);
}

function phpVarKey(name: string): string {
  return name.startsWith("$") ? name : `$${name}`;
}

function matchFormalParam(name: string, paramNames: readonly string[]): string | undefined {
  const key = phpVarKey(name);
  for (const p of paramNames) {
    if (phpVarKey(p) === key) return p;
  }
  return undefined;
}

function queryFromReturnStmt(m: Module, stmtId: NodeId): NodeId | undefined {
  const retStmt = getNode(m, stmtId);
  if (!retStmt || retStmt.op !== "call" || retStmt.attrs.callee !== "__return") return undefined;
  if (retStmt.operands.length !== 1) return undefined;
  const inner = getNode(m, retStmt.operands[0]!);
  if (!inner || inner.dialect !== "effect" || inner.op !== "db.query") return undefined;
  return retStmt.operands[0]!;
}

function isSkippablePreludeExprStmt(m: Module, stmt: NodeBase): boolean {
  if (stmt.op !== "call") return false;
  const callee = String(stmt.attrs.callee);
  if (callee === "strlen" || callee === "intval" || callee === "trim" || callee === "empty" || callee === "isset" || callee === "count" || callee === "is_array" || callee === "is_string" || callee === "abs" || callee === "is_numeric" || callee === "is_int" || callee === "is_bool" || callee === "is_null" || callee === "round" || callee === "floor" || callee === "ceil" || callee === "max" || callee === "min" || callee === "substr" || callee === "strpos" || callee === "stripos" || callee === "strrpos" || callee === "strripos" || callee === "str_contains" || callee === "strtolower" || callee === "strtoupper" || callee === "htmlspecialchars" || callee === "nl2br" || callee === "urlencode" || callee === "rawurlencode" || callee === "urldecode" || callee === "rawurldecode" || callee === "ltrim" || callee === "rtrim" || callee === "is_float" || callee === "is_object" || callee === "is_scalar") {
    return stmt.effects.length === 0;
  }
  return false;
}

function literalToTsExpr(n: NodeBase): string | undefined {
  if (n.op !== "literal") return undefined;
  const v = n.attrs.value;
  const kind = n.type?.kind;
  if (kind === "int" || kind === "float") return String(v);
  if (kind === "bool") return v ? "true" : "false";
  if (kind === "null") return "null";
  if (kind === "string") return stringLit(String(v ?? ""));
  return undefined;
}

function resolveInlineAssignRhs(
  m: Module,
  valueId: NodeId,
  paramNames: readonly string[],
  localToFormal: ReadonlyMap<string, string>,
): { kind: "formal"; formal: string } | { kind: "literal"; id: NodeId } | { kind: "coalesce"; formal: string; literalId: NodeId } | { kind: "roundFormal2"; formal: string; literalId: NodeId } | { kind: "maxFormalLiteral"; formal: string; literalId: NodeId } | { kind: "minFormalLiteral"; formal: string; literalId: NodeId } | { kind: "substrFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "striposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strrposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strriposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strContainsFormalLiteral"; formal: string; literalId: NodeId } | { kind: "stringCast"; formal: string } | { kind: "floatCast"; formal: string } | { kind: "boolCast"; formal: string } | { kind: "trimFormal"; formal: string } | { kind: "strlenFormal"; formal: string } | { kind: "emptyFormal"; formal: string } | { kind: "issetFormal"; formal: string } | { kind: "countFormal"; formal: string } | { kind: "isArrayFormal"; formal: string } | { kind: "isStringFormal"; formal: string } | { kind: "absFormal"; formal: string } | { kind: "isNumericFormal"; formal: string } | { kind: "notFormal"; formal: string } | { kind: "isIntFormal"; formal: string } | { kind: "isBoolFormal"; formal: string } | { kind: "isNullFormal"; formal: string } | { kind: "negFormal"; formal: string } | { kind: "roundFormal"; formal: string } | { kind: "floorFormal"; formal: string } | { kind: "ceilFormal"; formal: string } | { kind: "strtolowerFormal"; formal: string } | { kind: "strtoupperFormal"; formal: string } | { kind: "htmlspecialcharsFormal"; formal: string } | { kind: "nl2brFormal"; formal: string } | { kind: "urlencodeFormal"; formal: string } | { kind: "rawurlencodeFormal"; formal: string } | { kind: "urldecodeFormal"; formal: string } | { kind: "rawurldecodeFormal"; formal: string } | { kind: "ltrimFormal"; formal: string } | { kind: "rtrimFormal"; formal: string } | { kind: "isFloatFormal"; formal: string } | { kind: "isObjectFormal"; formal: string } | { kind: "isScalarFormal"; formal: string } | undefined {
  const valueNode = getNode(m, valueId);
  if (!valueNode) return undefined;
  if (valueNode.op === "literal") return { kind: "literal", id: valueId };
  if (valueNode.op === "param") {
    const srcName = String(valueNode.attrs.name ?? "");
    const formal =
      matchFormalParam(srcName, paramNames) ??
      localToFormal.get(phpVarKey(srcName)) ??
      localToFormal.get(srcName);
    if (formal === undefined) return undefined;
    return { kind: "formal", formal };
  }
  if (
    (valueNode.op === "unaryOp" || valueNode.op === "unaryop") &&
    valueNode.operands.length === 1
  ) {
    const op = String(valueNode.attrs.operator);
    if (op === "empty" || op === "isset") {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") {
        return op === "empty" ? { kind: "emptyFormal", formal: inner.formal } : { kind: "issetFormal", formal: inner.formal };
      }
    }
    if (op === "!") {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "notFormal", formal: inner.formal };
    }
    if (op === "-") {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "negFormal", formal: inner.formal };
    }
  }
  if (valueNode.op === "binop" && String(valueNode.attrs.operator) === "??" && valueNode.operands.length === 2) {
    const left = getNode(m, valueNode.operands[0]!);
    const literalId = valueNode.operands[1]!;
    const right = getNode(m, literalId);
    if (left?.op === "param" && right?.op === "literal") {
      const srcName = String(left.attrs.name ?? "");
      const formal =
        matchFormalParam(srcName, paramNames) ??
        localToFormal.get(phpVarKey(srcName)) ??
        localToFormal.get(srcName);
      if (formal === undefined) return undefined;
      return { kind: "coalesce", formal, literalId };
    }
  }
  if (valueNode.op === "call") {
    const callee = String(valueNode.attrs.callee ?? "");
    if ((callee === "__cast_int" || callee === "intval") && valueNode.operands.length === 1) {
      return resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
    }
    if ((callee === "__cast_string" || callee === "strval") && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "stringCast", formal: inner.formal };
    }
    if ((callee === "__cast_float" || callee === "floatval") && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "floatCast", formal: inner.formal };
    }
    if ((callee === "__cast_bool" || callee === "boolval") && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "boolCast", formal: inner.formal };
    }
    if (callee === "trim" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "trimFormal", formal: inner.formal };
    }
    if (callee === "strlen" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "strlenFormal", formal: inner.formal };
    }
    if ((callee === "empty" || callee === "__empty") && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "emptyFormal", formal: inner.formal };
    }
    if ((callee === "isset" || callee === "__isset") && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "issetFormal", formal: inner.formal };
    }
    if (callee === "count" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "countFormal", formal: inner.formal };
    }
    if (callee === "is_array" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isArrayFormal", formal: inner.formal };
    }
    if (callee === "is_string" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isStringFormal", formal: inner.formal };
    }
    if (callee === "abs" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "absFormal", formal: inner.formal };
    }
    if (callee === "is_numeric" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isNumericFormal", formal: inner.formal };
    }
    if (callee === "is_int" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isIntFormal", formal: inner.formal };
    }
    if (callee === "is_bool" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isBoolFormal", formal: inner.formal };
    }
    if (callee === "is_null" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isNullFormal", formal: inner.formal };
    }
    if (callee === "round" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "roundFormal2", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "round" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "roundFormal", formal: inner.formal };
    }
    if (callee === "max" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "maxFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "min" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "minFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "substr" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "substrFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strpos" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strposFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "stripos" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "striposFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strrpos" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strrposFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strripos" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strriposFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "str_contains" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strContainsFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "floor" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "floorFormal", formal: inner.formal };
    }
    if (callee === "ceil" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "ceilFormal", formal: inner.formal };
    }
    if (callee === "strtolower" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "strtolowerFormal", formal: inner.formal };
    }
    if (callee === "strtoupper" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "strtoupperFormal", formal: inner.formal };
    }
    if (callee === "htmlspecialchars" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "htmlspecialcharsFormal", formal: inner.formal };
    }
    if (callee === "nl2br" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "nl2brFormal", formal: inner.formal };
    }
    if (callee === "urlencode" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "urlencodeFormal", formal: inner.formal };
    }
    if (callee === "rawurlencode" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "rawurlencodeFormal", formal: inner.formal };
    }
    if (callee === "urldecode" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "urldecodeFormal", formal: inner.formal };
    }
    if (callee === "rawurldecode" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "rawurldecodeFormal", formal: inner.formal };
    }
    if (callee === "ltrim" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "ltrimFormal", formal: inner.formal };
    }
    if (callee === "rtrim" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "rtrimFormal", formal: inner.formal };
    }
    if (callee === "is_float" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isFloatFormal", formal: inner.formal };
    }
    if (callee === "is_object" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isObjectFormal", formal: inner.formal };
    }
    if (callee === "is_scalar" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "isScalarFormal", formal: inner.formal };
    }
  }
  return undefined;
}

export function tryExtractInlineQuery(
  m: Module,
  bodyId: NodeId,
  paramNames: readonly string[],
): {
  queryId: NodeId;
  localToFormal: ReadonlyMap<string, string>;
  localToLiteral: ReadonlyMap<string, NodeId>;
  localToCoalesce: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToRoundFormal2: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToMaxFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToMinFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToSubstrFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrposFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStriposFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrrposFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrriposFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrContainsFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStringCast: ReadonlyMap<string, string>;
  localToFloatCast: ReadonlyMap<string, string>;
  localToBoolCast: ReadonlyMap<string, string>;
  localToTrimFormal: ReadonlyMap<string, string>;
  localToStrlenFormal: ReadonlyMap<string, string>;
  localToEmptyFormal: ReadonlyMap<string, string>;
  localToIssetFormal: ReadonlyMap<string, string>;
  localToCountFormal: ReadonlyMap<string, string>;
  localToIsArrayFormal: ReadonlyMap<string, string>;
  localToIsStringFormal: ReadonlyMap<string, string>;
  localToAbsFormal: ReadonlyMap<string, string>;
  localToIsNumericFormal: ReadonlyMap<string, string>;
  localToNotFormal: ReadonlyMap<string, string>;
  localToIsIntFormal: ReadonlyMap<string, string>;
  localToIsBoolFormal: ReadonlyMap<string, string>;
  localToIsNullFormal: ReadonlyMap<string, string>;
  localToNegFormal: ReadonlyMap<string, string>;
  localToRoundFormal: ReadonlyMap<string, string>;
  localToFloorFormal: ReadonlyMap<string, string>;
  localToCeilFormal: ReadonlyMap<string, string>;
  localToStrtolowerFormal: ReadonlyMap<string, string>;
  localToStrtoupperFormal: ReadonlyMap<string, string>;
  localToHtmlspecialcharsFormal: ReadonlyMap<string, string>;
  localToNl2brFormal: ReadonlyMap<string, string>;
  localToUrlencodeFormal: ReadonlyMap<string, string>;
  localToRawurlencodeFormal: ReadonlyMap<string, string>;
  localToUrldecodeFormal: ReadonlyMap<string, string>;
  localToRawurldecodeFormal: ReadonlyMap<string, string>;
  localToLtrimFormal: ReadonlyMap<string, string>;
  localToRtrimFormal: ReadonlyMap<string, string>;
  localToIsFloatFormal: ReadonlyMap<string, string>;
  localToIsObjectFormal: ReadonlyMap<string, string>;
  localToIsScalarFormal: ReadonlyMap<string, string>;
} | undefined {
  const body = getNode(m, bodyId);
  if (!body || body.dialect !== "data" || body.op !== "block") return undefined;
  const stmts = body.operands;
  if (stmts.length === 0) return undefined;
  const queryId = queryFromReturnStmt(m, stmts[stmts.length - 1]!);
  if (queryId === undefined) return undefined;
  if (stmts.length === 1) {
    return { queryId, localToFormal: new Map(), localToLiteral: new Map(), localToCoalesce: new Map(), localToRoundFormal2: new Map(), localToMaxFormalLiteral: new Map(), localToMinFormalLiteral: new Map(), localToSubstrFormalLiteral: new Map(), localToStrposFormalLiteral: new Map(), localToStriposFormalLiteral: new Map(), localToStrrposFormalLiteral: new Map(), localToStrriposFormalLiteral: new Map(), localToStrContainsFormalLiteral: new Map(), localToStringCast: new Map(), localToFloatCast: new Map(), localToBoolCast: new Map(), localToTrimFormal: new Map(), localToStrlenFormal: new Map(), localToEmptyFormal: new Map(), localToIssetFormal: new Map(), localToCountFormal: new Map(), localToIsArrayFormal: new Map(), localToIsStringFormal: new Map(), localToAbsFormal: new Map(), localToIsNumericFormal: new Map(), localToNotFormal: new Map(), localToIsIntFormal: new Map(), localToIsBoolFormal: new Map(), localToIsNullFormal: new Map(), localToNegFormal: new Map(), localToRoundFormal: new Map(), localToFloorFormal: new Map(), localToCeilFormal: new Map(), localToStrtolowerFormal: new Map(), localToStrtoupperFormal: new Map(), localToHtmlspecialcharsFormal: new Map(), localToNl2brFormal: new Map(), localToUrlencodeFormal: new Map(), localToRawurlencodeFormal: new Map(), localToUrldecodeFormal: new Map(), localToRawurldecodeFormal: new Map(), localToLtrimFormal: new Map(), localToRtrimFormal: new Map(), localToIsFloatFormal: new Map(), localToIsObjectFormal: new Map(), localToIsScalarFormal: new Map() };
  }
  const localToFormal = new Map<string, string>();
  const localToLiteral = new Map<string, NodeId>();
  const localToCoalesce = new Map<string, { formal: string; literalId: NodeId }>();
  const localToRoundFormal2 = new Map<string, { formal: string; literalId: NodeId }>();
  const localToMaxFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToMinFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToSubstrFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrposFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStriposFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrrposFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrriposFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrContainsFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStringCast = new Map<string, string>();
  const localToFloatCast = new Map<string, string>();
  const localToBoolCast = new Map<string, string>();
  const localToTrimFormal = new Map<string, string>();
  const localToStrlenFormal = new Map<string, string>();
  const localToEmptyFormal = new Map<string, string>();
  const localToIssetFormal = new Map<string, string>();
  const localToCountFormal = new Map<string, string>();
  const localToIsArrayFormal = new Map<string, string>();
  const localToIsStringFormal = new Map<string, string>();
  const localToAbsFormal = new Map<string, string>();
  const localToIsNumericFormal = new Map<string, string>();
  const localToNotFormal = new Map<string, string>();
  const localToIsIntFormal = new Map<string, string>();
  const localToIsBoolFormal = new Map<string, string>();
  const localToIsNullFormal = new Map<string, string>();
  const localToNegFormal = new Map<string, string>();
  const localToRoundFormal = new Map<string, string>();
  const localToFloorFormal = new Map<string, string>();
  const localToCeilFormal = new Map<string, string>();
  const localToStrtolowerFormal = new Map<string, string>();
  const localToStrtoupperFormal = new Map<string, string>();
  const localToHtmlspecialcharsFormal = new Map<string, string>();
  const localToNl2brFormal = new Map<string, string>();
  const localToUrlencodeFormal = new Map<string, string>();
  const localToRawurlencodeFormal = new Map<string, string>();
  const localToUrldecodeFormal = new Map<string, string>();
  const localToRawurldecodeFormal = new Map<string, string>();
  const localToLtrimFormal = new Map<string, string>();
  const localToRtrimFormal = new Map<string, string>();
  const localToIsFloatFormal = new Map<string, string>();
  const localToIsObjectFormal = new Map<string, string>();
  const localToIsScalarFormal = new Map<string, string>();
  for (let i = 0; i < stmts.length - 1; i++) {
    const stmtId = stmts[i]!;
    const stmt = getNode(m, stmtId);
    if (!stmt) return undefined;
    if (stmt.op === "call" && stmt.attrs.callee === "__assign") {
      const targetLit = getNode(m, stmt.operands[0]!);
      const valueId = stmt.operands[1]!;
      if (!targetLit || targetLit.op !== "literal") return undefined;
      const localName = phpVarKey(String(targetLit.attrs.value ?? ""));
      const resolved = resolveInlineAssignRhs(m, valueId, paramNames, localToFormal);
      if (resolved === undefined) return undefined;
      if (resolved.kind === "literal") {
        localToLiteral.set(localName, resolved.id);
        continue;
      }
      if (resolved.kind === "coalesce") {
        localToCoalesce.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "roundFormal2") {
        localToRoundFormal2.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "maxFormalLiteral") {
        localToMaxFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "minFormalLiteral") {
        localToMinFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "substrFormalLiteral") {
        localToSubstrFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strposFormalLiteral") {
        localToStrposFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "striposFormalLiteral") {
        localToStriposFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strrposFormalLiteral") {
        localToStrrposFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strriposFormalLiteral") {
        localToStrriposFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strContainsFormalLiteral") {
        localToStrContainsFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "stringCast") {
        localToStringCast.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "floatCast") {
        localToFloatCast.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "boolCast") {
        localToBoolCast.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "trimFormal") {
        localToTrimFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "strlenFormal") {
        localToStrlenFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "emptyFormal") {
        localToEmptyFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "issetFormal") {
        localToIssetFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "countFormal") {
        localToCountFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isArrayFormal") {
        localToIsArrayFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isStringFormal") {
        localToIsStringFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "absFormal") {
        localToAbsFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isNumericFormal") {
        localToIsNumericFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "notFormal") {
        localToNotFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isIntFormal") {
        localToIsIntFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isBoolFormal") {
        localToIsBoolFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isNullFormal") {
        localToIsNullFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "negFormal") {
        localToNegFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "roundFormal") {
        localToRoundFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "floorFormal") {
        localToFloorFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "ceilFormal") {
        localToCeilFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "strtolowerFormal") {
        localToStrtolowerFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "strtoupperFormal") {
        localToStrtoupperFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "htmlspecialcharsFormal") {
        localToHtmlspecialcharsFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "nl2brFormal") {
        localToNl2brFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "urlencodeFormal") {
        localToUrlencodeFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "rawurlencodeFormal") {
        localToRawurlencodeFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "urldecodeFormal") {
        localToUrldecodeFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "rawurldecodeFormal") {
        localToRawurldecodeFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "ltrimFormal") {
        localToLtrimFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "rtrimFormal") {
        localToRtrimFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isFloatFormal") {
        localToIsFloatFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isObjectFormal") {
        localToIsObjectFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "isScalarFormal") {
        localToIsScalarFormal.set(localName, resolved.formal);
        continue;
      }
      localToFormal.set(localName, resolved.formal);
      continue;
    }
    if (stmt.op === "hole") return undefined;
    if (stmt.effects.length > 0) return undefined;
    if (isSkippablePreludeExprStmt(m, stmt)) continue;
    return undefined;
  }
  return { queryId, localToFormal, localToLiteral, localToCoalesce, localToRoundFormal2, localToMaxFormalLiteral, localToMinFormalLiteral, localToSubstrFormalLiteral, localToStrposFormalLiteral, localToStriposFormalLiteral, localToStrrposFormalLiteral, localToStrriposFormalLiteral, localToStrContainsFormalLiteral, localToStringCast, localToFloatCast, localToBoolCast, localToTrimFormal, localToStrlenFormal, localToEmptyFormal, localToIssetFormal, localToCountFormal, localToIsArrayFormal, localToIsStringFormal, localToAbsFormal, localToIsNumericFormal, localToNotFormal, localToIsIntFormal, localToIsBoolFormal, localToIsNullFormal, localToNegFormal, localToRoundFormal, localToFloorFormal, localToCeilFormal, localToStrtolowerFormal, localToStrtoupperFormal, localToHtmlspecialcharsFormal, localToNl2brFormal, localToUrlencodeFormal, localToRawurlencodeFormal, localToUrldecodeFormal, localToRawurldecodeFormal, localToLtrimFormal, localToRtrimFormal, localToIsFloatFormal, localToIsObjectFormal, localToIsScalarFormal };
}

/** Valid TS export name for a PHP lib helper callee (`Class::method`, FQN, or global). */
export function libHelperTsExportName(callee: string): string {
  const tail = callee.includes("\\") ? callee.slice(callee.lastIndexOf("\\") + 1) : callee;
  return ident(tail);
}

export function resolveHelperBodyEntry(
  bodies: NonNullable<Module["meta"]["helperBodies"]>,
  callee: string,
): { readonly bodyId: NodeId; readonly paramNames: readonly string[] } | undefined {
  const direct = bodies[callee];
  if (direct !== undefined) return direct;
  const sanitized = libHelperTsExportName(callee);
  for (const [key, entry] of Object.entries(bodies)) {
    if (key === callee || libHelperTsExportName(key) === sanitized) return entry;
  }
  if (callee.includes("::")) {
    for (const [key, entry] of Object.entries(bodies)) {
      if (key.endsWith("\\" + callee)) return entry;
    }
  }
  const tail = callee.includes("\\") ? callee.slice(callee.lastIndexOf("\\") + 1) : callee;
  return bodies[tail];
}

function dbQueryTypeArg(ctx: EmitInlineCtx, n: NodeBase): string {
  if (!ctx.domainTypesByTable) return "";
  const tablesRaw = n.attrs.tables;
  if (!Array.isArray(tablesRaw) || tablesRaw.length !== 1) return "";
  const table = String(tablesRaw[0]).toLowerCase();
  const tsName = ctx.domainTypesByTable[table];
  if (!tsName) return "";
  ctx.domainTypeImports.add(tsName);
  return `<${tsName}>`;
}

function emitDbQueryExpr(ctx: EmitInlineCtx, n: NodeBase, subst: Readonly<Record<string, string>>): string {
  const mode = String(n.attrs.returns);
  const sql = String(n.attrs.sql);
  const params = n.operands.map((o) => {
    const pn = getNode(ctx.m, o);
    if (pn?.op === "param" && typeof pn.attrs.name === "string") {
      const name = pn.attrs.name;
      const rep =
        subst[name] ??
        subst[phpVarKey(name)] ??
        subst[name.startsWith("$") ? name.slice(1) : name];
      if (rep !== undefined) return rep;
    }
    return ctx.emitParamExpr(o, subst);
  });
  const tArg = dbQueryTypeArg(ctx, n);
  if (mode === "rows") {
    return `queryAll${tArg}(${stringLit(sql)}, [${params.join(", ")}])`;
  }
  if (mode === "row-or-null") {
    return `queryOne${tArg}(${stringLit(sql)}, [${params.join(", ")}])`;
  }
  return `execSql(${stringLit(sql)}, [${params.join(", ")}])`;
}

/** Returns TS expression when lib helper db.read body can be inlined at emit. */
export function tryEmitInlineLibHelperCall(
  ctx: EmitInlineCtx,
  callee: string,
  argExprs: readonly string[],
): string | undefined {
  const bodies = ctx.m.meta.helperBodies;
  if (!bodies) return undefined;
  const entry = resolveHelperBodyEntry(bodies, callee);
  if (entry === undefined) return undefined;
  if (argExprs.length !== entry.paramNames.length) return undefined;
  const extracted = tryExtractInlineQuery(ctx.m, entry.bodyId, entry.paramNames);
  if (extracted === undefined) return undefined;
  const subst: Record<string, string> = {};
  if (entry.paramNames.length === 0) {
    const q = getNode(ctx.m, extracted.queryId);
    if (!q || q.op !== "db.query") return undefined;
    return emitDbQueryExpr(ctx, q, subst);
  }
  for (let i = 0; i < entry.paramNames.length; i++) {
    const formal = entry.paramNames[i]!;
    const expr = argExprs[i]!;
    subst[formal] = expr;
    subst[phpVarKey(formal)] = expr;
  }
  for (const [local, formal] of extracted.localToFormal) {
    const expr = subst[formal] ?? subst[phpVarKey(formal)];
    if (expr === undefined) return undefined;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, literalId] of extracted.localToLiteral) {
    const lit = getNode(ctx.m, literalId);
    if (!lit) return undefined;
    const expr = literalToTsExpr(lit);
    if (expr === undefined) return undefined;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToCoalesce) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const coalesced = `(${formalExpr} ?? ${litExpr})`;
    subst[local] = coalesced;
    subst[phpVarKey(local)] = coalesced;
  }
  for (const [local, { formal, literalId }] of extracted.localToRoundFormal2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const rounded = `round(${formalExpr}, ${litExpr})`;
    subst[local] = rounded;
    subst[phpVarKey(local)] = rounded;
  }
  for (const [local, { formal, literalId }] of extracted.localToMaxFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const maxed = `max(${formalExpr}, ${litExpr})`;
    subst[local] = maxed;
    subst[phpVarKey(local)] = maxed;
  }
  for (const [local, { formal, literalId }] of extracted.localToMinFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const mined = `min(${formalExpr}, ${litExpr})`;
    subst[local] = mined;
    subst[phpVarKey(local)] = mined;
  }
  for (const [local, { formal, literalId }] of extracted.localToSubstrFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const sub = `substr(${formalExpr}, ${litExpr})`;
    subst[local] = sub;
    subst[phpVarKey(local)] = sub;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrposFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const pos = `String(${formalExpr}).indexOf(${litExpr})`;
    subst[local] = pos;
    subst[phpVarKey(local)] = pos;
  }
  for (const [local, { formal, literalId }] of extracted.localToStriposFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const pos = `String(${formalExpr}).toLowerCase().indexOf(String(${litExpr}).toLowerCase())`;
    subst[local] = pos;
    subst[phpVarKey(local)] = pos;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrrposFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const pos = `String(${formalExpr}).lastIndexOf(${litExpr})`;
    subst[local] = pos;
    subst[phpVarKey(local)] = pos;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrriposFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const pos = `String(${formalExpr}).toLowerCase().lastIndexOf(String(${litExpr}).toLowerCase())`;
    subst[local] = pos;
    subst[phpVarKey(local)] = pos;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrContainsFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const has = `String(${formalExpr}).includes(${litExpr})`;
    subst[local] = has;
    subst[phpVarKey(local)] = has;
  }
  for (const [local, formal] of extracted.localToStringCast) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const casted = `String(${formalExpr})`;
    subst[local] = casted;
    subst[phpVarKey(local)] = casted;
  }
  for (const [local, formal] of extracted.localToFloatCast) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const casted = `Number(${formalExpr})`;
    subst[local] = casted;
    subst[phpVarKey(local)] = casted;
  }
  for (const [local, formal] of extracted.localToBoolCast) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const casted = `Boolean(${formalExpr})`;
    subst[local] = casted;
    subst[phpVarKey(local)] = casted;
  }
  for (const [local, formal] of extracted.localToTrimFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const trimmed = `String(${formalExpr}).trim()`;
    subst[local] = trimmed;
    subst[phpVarKey(local)] = trimmed;
  }
  for (const [local, formal] of extracted.localToStrlenFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const len = `String(${formalExpr}).length`;
    subst[local] = len;
    subst[phpVarKey(local)] = len;
  }
  for (const [local, formal] of extracted.localToEmptyFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const emptied = `empty(${formalExpr})`;
    subst[local] = emptied;
    subst[phpVarKey(local)] = emptied;
  }
  for (const [local, formal] of extracted.localToIssetFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isseted = `isset(${formalExpr})`;
    subst[local] = isseted;
    subst[phpVarKey(local)] = isseted;
  }
  for (const [local, formal] of extracted.localToCountFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const counted = `count(${formalExpr})`;
    subst[local] = counted;
    subst[phpVarKey(local)] = counted;
  }
  for (const [local, formal] of extracted.localToIsArrayFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isArrayed = `is_array(${formalExpr})`;
    subst[local] = isArrayed;
    subst[phpVarKey(local)] = isArrayed;
  }
  for (const [local, formal] of extracted.localToIsStringFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isStringed = `is_string(${formalExpr})`;
    subst[local] = isStringed;
    subst[phpVarKey(local)] = isStringed;
  }
  for (const [local, formal] of extracted.localToAbsFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const absed = `abs(${formalExpr})`;
    subst[local] = absed;
    subst[phpVarKey(local)] = absed;
  }
  for (const [local, formal] of extracted.localToIsNumericFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isNumericed = `is_numeric(${formalExpr})`;
    subst[local] = isNumericed;
    subst[phpVarKey(local)] = isNumericed;
  }
  for (const [local, formal] of extracted.localToNotFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const noted = `!(${formalExpr})`;
    subst[local] = noted;
    subst[phpVarKey(local)] = noted;
  }
  for (const [local, formal] of extracted.localToIsIntFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isInted = `is_int(${formalExpr})`;
    subst[local] = isInted;
    subst[phpVarKey(local)] = isInted;
  }
  for (const [local, formal] of extracted.localToIsBoolFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isBooled = `is_bool(${formalExpr})`;
    subst[local] = isBooled;
    subst[phpVarKey(local)] = isBooled;
  }
  for (const [local, formal] of extracted.localToIsNullFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isNulled = `is_null(${formalExpr})`;
    subst[local] = isNulled;
    subst[phpVarKey(local)] = isNulled;
  }
  for (const [local, formal] of extracted.localToNegFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const neged = `-(${formalExpr})`;
    subst[local] = neged;
    subst[phpVarKey(local)] = neged;
  }
  for (const [local, formal] of extracted.localToRoundFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const rounded = `round(${formalExpr})`;
    subst[local] = rounded;
    subst[phpVarKey(local)] = rounded;
  }
  for (const [local, formal] of extracted.localToFloorFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const floored = `floor(${formalExpr})`;
    subst[local] = floored;
    subst[phpVarKey(local)] = floored;
  }
  for (const [local, formal] of extracted.localToCeilFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const ceiled = `ceil(${formalExpr})`;
    subst[local] = ceiled;
    subst[phpVarKey(local)] = ceiled;
  }
  for (const [local, formal] of extracted.localToStrtolowerFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const lowered = `String(${formalExpr}).toLowerCase()`;
    subst[local] = lowered;
    subst[phpVarKey(local)] = lowered;
  }
  for (const [local, formal] of extracted.localToStrtoupperFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const uppered = `String(${formalExpr}).toUpperCase()`;
    subst[local] = uppered;
    subst[phpVarKey(local)] = uppered;
  }
  for (const [local, formal] of extracted.localToHtmlspecialcharsFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const escaped = `escapeHtml(${formalExpr})`;
    subst[local] = escaped;
    subst[phpVarKey(local)] = escaped;
  }
  for (const [local, formal] of extracted.localToNl2brFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const br = `nl2br(${formalExpr})`;
    subst[local] = br;
    subst[phpVarKey(local)] = br;
  }
  for (const [local, formal] of extracted.localToUrlencodeFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const encoded = `urlencode(${formalExpr})`;
    subst[local] = encoded;
    subst[phpVarKey(local)] = encoded;
  }
  for (const [local, formal] of extracted.localToRawurlencodeFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const encoded = `rawurlencode(${formalExpr})`;
    subst[local] = encoded;
    subst[phpVarKey(local)] = encoded;
  }
  for (const [local, formal] of extracted.localToUrldecodeFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const decoded = `urldecode(${formalExpr})`;
    subst[local] = decoded;
    subst[phpVarKey(local)] = decoded;
  }
  for (const [local, formal] of extracted.localToRawurldecodeFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const decoded = `rawurldecode(${formalExpr})`;
    subst[local] = decoded;
    subst[phpVarKey(local)] = decoded;
  }
  for (const [local, formal] of extracted.localToLtrimFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const trimmed = `ltrim(${formalExpr})`;
    subst[local] = trimmed;
    subst[phpVarKey(local)] = trimmed;
  }
  for (const [local, formal] of extracted.localToRtrimFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const trimmed = `rtrim(${formalExpr})`;
    subst[local] = trimmed;
    subst[phpVarKey(local)] = trimmed;
  }
  for (const [local, formal] of extracted.localToIsFloatFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isFloated = `is_float(${formalExpr})`;
    subst[local] = isFloated;
    subst[phpVarKey(local)] = isFloated;
  }
  for (const [local, formal] of extracted.localToIsObjectFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isObjected = `is_object(${formalExpr})`;
    subst[local] = isObjected;
    subst[phpVarKey(local)] = isObjected;
  }
  for (const [local, formal] of extracted.localToIsScalarFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const isScalars = `is_scalar(${formalExpr})`;
    subst[local] = isScalars;
    subst[phpVarKey(local)] = isScalars;
  }
  const q = getNode(ctx.m, extracted.queryId);
  if (!q || q.op !== "db.query") return undefined;
  return emitDbQueryExpr(ctx, q, subst);
}

/** Lib helpers referenced at call sites that cannot be emit-inlined need lowered TS bodies. */
export function libHelpersNeedingEmitModule(
  m: Module,
  referenced: ReadonlySet<string>,
): readonly string[] {
  const bodies = m.meta.helperBodies;
  if (!bodies || referenced.size === 0) return [];
  const out: string[] = [];
  for (const callee of referenced) {
    const entry = resolveHelperBodyEntry(bodies, callee);
    if (entry === undefined) continue;
    if (tryExtractInlineQuery(m, entry.bodyId, entry.paramNames) !== undefined) continue;
    const exportName = libHelperTsExportName(callee);
    if (!out.includes(exportName)) out.push(exportName);
  }
  return out.sort();
}
