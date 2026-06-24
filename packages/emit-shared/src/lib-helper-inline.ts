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
  if (callee === "strlen" || callee === "intval" || callee === "trim" || callee === "empty" || callee === "isset" || callee === "count" || callee === "is_array" || callee === "is_string" || callee === "abs" || callee === "is_numeric" || callee === "is_int" || callee === "is_bool" || callee === "is_null" || callee === "round" || callee === "floor" || callee === "ceil" || callee === "max" || callee === "min" || callee === "substr" || callee === "strpos" || callee === "stripos" || callee === "strrpos" || callee === "strripos" || callee === "str_contains" || callee === "str_starts_with" || callee === "str_ends_with" || callee === "substr_count" || callee === "explode" || callee === "strcmp" || callee === "strcasecmp" || callee === "strncmp" || callee === "strncasecmp" || callee === "strrev" || callee === "str_repeat" || callee === "str_pad" || callee === "strtolower" || callee === "strtoupper" || callee === "htmlspecialchars" || callee === "nl2br" || callee === "urlencode" || callee === "rawurlencode" || callee === "urldecode" || callee === "rawurldecode" || callee === "ltrim" || callee === "rtrim" || callee === "is_float" || callee === "is_object" || callee === "is_scalar" || callee === "str_replace" || callee === "str_ireplace" || callee === "ucfirst" || callee === "lcfirst" || callee === "ucwords" || callee === "strip_tags" || callee === "addslashes" || callee === "stripslashes" || callee === "str_rot13" || callee === "str_word_count" || callee === "str_split" || callee === "strcspn" || callee === "strspn" || callee === "wordwrap" || callee === "chunk_split" || callee === "strtr" || callee === "htmlentities" || callee === "html_entity_decode") {
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
): { kind: "formal"; formal: string } | { kind: "literal"; id: NodeId } | { kind: "coalesce"; formal: string; literalId: NodeId } | { kind: "roundFormal2"; formal: string; literalId: NodeId } | { kind: "maxFormalLiteral"; formal: string; literalId: NodeId } | { kind: "minFormalLiteral"; formal: string; literalId: NodeId } | { kind: "substrFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "striposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strrposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strriposFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strContainsFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strStartsWithFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strEndsWithFormalLiteral"; formal: string; literalId: NodeId } | { kind: "substrCountFormalLiteral"; formal: string; literalId: NodeId } | { kind: "explodeFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strcmpFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strcasecmpFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strncmpFormalLiteral2"; formal: string; needleLiteralId: NodeId; lengthLiteralId: NodeId } | { kind: "strncasecmpFormalLiteral2"; formal: string; needleLiteralId: NodeId; lengthLiteralId: NodeId } | { kind: "strrevFormal"; formal: string } | { kind: "strRepeatFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strPadFormalLiteral2"; formal: string; lengthLiteralId: NodeId; padLiteralId: NodeId } | { kind: "stringCast"; formal: string } | { kind: "floatCast"; formal: string } | { kind: "boolCast"; formal: string } | { kind: "trimFormal"; formal: string } | { kind: "strlenFormal"; formal: string } | { kind: "emptyFormal"; formal: string } | { kind: "issetFormal"; formal: string } | { kind: "countFormal"; formal: string } | { kind: "isArrayFormal"; formal: string } | { kind: "isStringFormal"; formal: string } | { kind: "absFormal"; formal: string } | { kind: "isNumericFormal"; formal: string } | { kind: "notFormal"; formal: string } | { kind: "isIntFormal"; formal: string } | { kind: "isBoolFormal"; formal: string } | { kind: "isNullFormal"; formal: string } | { kind: "negFormal"; formal: string } | { kind: "roundFormal"; formal: string } | { kind: "floorFormal"; formal: string } | { kind: "ceilFormal"; formal: string } | { kind: "strtolowerFormal"; formal: string } | { kind: "strtoupperFormal"; formal: string } | { kind: "htmlspecialcharsFormal"; formal: string } | { kind: "nl2brFormal"; formal: string } | { kind: "urlencodeFormal"; formal: string } | { kind: "rawurlencodeFormal"; formal: string } | { kind: "urldecodeFormal"; formal: string } | { kind: "rawurldecodeFormal"; formal: string } | { kind: "ltrimFormal"; formal: string } | { kind: "rtrimFormal"; formal: string } | { kind: "isFloatFormal"; formal: string } | { kind: "isObjectFormal"; formal: string } | { kind: "isScalarFormal"; formal: string }| { kind: "ucfirstFormal"; formal: string } | { kind: "lcfirstFormal"; formal: string } | { kind: "ucwordsFormal"; formal: string } | { kind: "stripTagsFormal"; formal: string } | { kind: "addslashesFormal"; formal: string } | { kind: "stripslashesFormal"; formal: string } | { kind: "strRot13Formal"; formal: string } | { kind: "strWordCountFormal"; formal: string } | { kind: "htmlentitiesFormal"; formal: string } | { kind: "htmlEntityDecodeFormal"; formal: string } | { kind: "strSplitFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strcspnFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strspnFormalLiteral"; formal: string; literalId: NodeId } | { kind: "ltrimFormalLiteral"; formal: string; literalId: NodeId } | { kind: "rtrimFormalLiteral"; formal: string; literalId: NodeId } | { kind: "trimFormalLiteral"; formal: string; literalId: NodeId } | { kind: "strReplaceFormalLiteral2"; formal: string; searchLiteralId: NodeId; replaceLiteralId: NodeId } | { kind: "strIreplaceFormalLiteral2"; formal: string; searchLiteralId: NodeId; replaceLiteralId: NodeId } | { kind: "wordwrapFormalLiteral2"; formal: string; widthLiteralId: NodeId; breakLiteralId: NodeId } | { kind: "chunkSplitFormalLiteral2"; formal: string; widthLiteralId: NodeId; breakLiteralId: NodeId } | { kind: "strtrFormalLiteral2"; formal: string; fromLiteralId: NodeId; toLiteralId: NodeId } | undefined {
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
    if (callee === "str_starts_with" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strStartsWithFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "str_ends_with" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strEndsWithFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "substr_count" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "substrCountFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "explode" && valueNode.operands.length === 2) {
      const lit = getNode(m, valueNode.operands[0]!);
      const inner = resolveInlineAssignRhs(m, valueNode.operands[1]!, paramNames, localToFormal);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "explodeFormalLiteral", formal: inner.formal, literalId: valueNode.operands[0]! };
      }
    }
    if (callee === "strcmp" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strcmpFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strcasecmp" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strcasecmpFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strncmp" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const needleLit = getNode(m, valueNode.operands[1]!);
      const lengthLit = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && needleLit?.op === "literal" && lengthLit?.op === "literal") {
        return {
          kind: "strncmpFormalLiteral2",
          formal: inner.formal,
          needleLiteralId: valueNode.operands[1]!,
          lengthLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "strncasecmp" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const needleLit = getNode(m, valueNode.operands[1]!);
      const lengthLit = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && needleLit?.op === "literal" && lengthLit?.op === "literal") {
        return {
          kind: "strncasecmpFormalLiteral2",
          formal: inner.formal,
          needleLiteralId: valueNode.operands[1]!,
          lengthLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "str_repeat" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strRepeatFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "str_pad" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lengthLit = getNode(m, valueNode.operands[1]!);
      const padLit = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && lengthLit?.op === "literal" && padLit?.op === "literal") {
        return {
          kind: "strPadFormalLiteral2",
          formal: inner.formal,
          lengthLiteralId: valueNode.operands[1]!,
          padLiteralId: valueNode.operands[2]!,
        };
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
    if (callee === "strrev" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "strrevFormal", formal: inner.formal };
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
    /* B55-B75 IR helper lifting */
    if (callee === "str_replace" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit2 = getNode(m, valueNode.operands[1]!);
      const lit3 = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && lit2?.op === "literal" && lit3?.op === "literal") {
        return {
          kind: "strReplaceFormalLiteral2",
          formal: inner.formal,
          searchLiteralId: valueNode.operands[1]!,
          replaceLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "str_ireplace" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit2 = getNode(m, valueNode.operands[1]!);
      const lit3 = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && lit2?.op === "literal" && lit3?.op === "literal") {
        return {
          kind: "strIreplaceFormalLiteral2",
          formal: inner.formal,
          searchLiteralId: valueNode.operands[1]!,
          replaceLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "wordwrap" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit2 = getNode(m, valueNode.operands[1]!);
      const lit3 = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && lit2?.op === "literal" && lit3?.op === "literal") {
        return {
          kind: "wordwrapFormalLiteral2",
          formal: inner.formal,
          widthLiteralId: valueNode.operands[1]!,
          breakLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "chunk_split" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit2 = getNode(m, valueNode.operands[1]!);
      const lit3 = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && lit2?.op === "literal" && lit3?.op === "literal") {
        return {
          kind: "chunkSplitFormalLiteral2",
          formal: inner.formal,
          widthLiteralId: valueNode.operands[1]!,
          breakLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "strtr" && valueNode.operands.length === 3) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit2 = getNode(m, valueNode.operands[1]!);
      const lit3 = getNode(m, valueNode.operands[2]!);
      if (inner?.kind === "formal" && lit2?.op === "literal" && lit3?.op === "literal") {
        return {
          kind: "strtrFormalLiteral2",
          formal: inner.formal,
          fromLiteralId: valueNode.operands[1]!,
          toLiteralId: valueNode.operands[2]!,
        };
      }
    }
    if (callee === "ucfirst" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "ucfirstFormal", formal: inner.formal };
    }
    if (callee === "lcfirst" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "lcfirstFormal", formal: inner.formal };
    }
    if (callee === "ucwords" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "ucwordsFormal", formal: inner.formal };
    }
    if (callee === "strip_tags" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "stripTagsFormal", formal: inner.formal };
    }
    if (callee === "addslashes" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "addslashesFormal", formal: inner.formal };
    }
    if (callee === "stripslashes" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "stripslashesFormal", formal: inner.formal };
    }
    if (callee === "str_rot13" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "strRot13Formal", formal: inner.formal };
    }
    if (callee === "str_word_count" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "strWordCountFormal", formal: inner.formal };
    }
    if (callee === "htmlentities" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "htmlentitiesFormal", formal: inner.formal };
    }
    if (callee === "html_entity_decode" && valueNode.operands.length === 1) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      if (inner?.kind === "formal") return { kind: "htmlEntityDecodeFormal", formal: inner.formal };
    }
    if (callee === "str_split" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strSplitFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strcspn" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strcspnFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "strspn" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "strspnFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "ltrim" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "ltrimFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "rtrim" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "rtrimFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
    }
    if (callee === "trim" && valueNode.operands.length === 2) {
      const inner = resolveInlineAssignRhs(m, valueNode.operands[0]!, paramNames, localToFormal);
      const lit = getNode(m, valueNode.operands[1]!);
      if (inner?.kind === "formal" && lit?.op === "literal") {
        return { kind: "trimFormalLiteral", formal: inner.formal, literalId: valueNode.operands[1]! };
      }
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
  localToStrStartsWithFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrEndsWithFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToSubstrCountFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToExplodeFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrcmpFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrcasecmpFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrncmpFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly needleLiteralId: NodeId; readonly lengthLiteralId: NodeId }>;
  localToStrncasecmpFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly needleLiteralId: NodeId; readonly lengthLiteralId: NodeId }>;
  localToStrrevFormal: ReadonlyMap<string, string>;
  localToStrRepeatFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrPadFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly lengthLiteralId: NodeId; readonly padLiteralId: NodeId }>;
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
  localToUcfirstFormal: ReadonlyMap<string, string>;
  localToLcfirstFormal: ReadonlyMap<string, string>;
  localToUcwordsFormal: ReadonlyMap<string, string>;
  localToStripTagsFormal: ReadonlyMap<string, string>;
  localToAddslashesFormal: ReadonlyMap<string, string>;
  localToStripslashesFormal: ReadonlyMap<string, string>;
  localToStrRot13Formal: ReadonlyMap<string, string>;
  localToStrWordCountFormal: ReadonlyMap<string, string>;
  localToHtmlentitiesFormal: ReadonlyMap<string, string>;
  localToHtmlEntityDecodeFormal: ReadonlyMap<string, string>;
  localToStrSplitFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrcspnFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrspnFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToLtrimFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToRtrimFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToTrimFormalLiteral: ReadonlyMap<string, { readonly formal: string; readonly literalId: NodeId }>;
  localToStrReplaceFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly searchLiteralId: NodeId; readonly replaceLiteralId: NodeId }>;
  localToStrIreplaceFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly searchLiteralId: NodeId; readonly replaceLiteralId: NodeId }>;
  localToWordwrapFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly widthLiteralId: NodeId; readonly breakLiteralId: NodeId }>;
  localToChunkSplitFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly widthLiteralId: NodeId; readonly breakLiteralId: NodeId }>;
  localToStrtrFormalLiteral2: ReadonlyMap<string, { readonly formal: string; readonly fromLiteralId: NodeId; readonly toLiteralId: NodeId }>;
} | undefined {
  const body = getNode(m, bodyId);
  if (!body || body.dialect !== "data" || body.op !== "block") return undefined;
  const stmts = body.operands;
  if (stmts.length === 0) return undefined;
  const queryId = queryFromReturnStmt(m, stmts[stmts.length - 1]!);
  if (queryId === undefined) return undefined;
  if (stmts.length === 1) {
    return { queryId, localToFormal: new Map(), localToLiteral: new Map(), localToCoalesce: new Map(), localToRoundFormal2: new Map(), localToMaxFormalLiteral: new Map(), localToMinFormalLiteral: new Map(), localToSubstrFormalLiteral: new Map(), localToStrposFormalLiteral: new Map(), localToStriposFormalLiteral: new Map(), localToStrrposFormalLiteral: new Map(), localToStrriposFormalLiteral: new Map(), localToStrContainsFormalLiteral: new Map(), localToStrStartsWithFormalLiteral: new Map(), localToStrEndsWithFormalLiteral: new Map(), localToSubstrCountFormalLiteral: new Map(), localToExplodeFormalLiteral: new Map(), localToStrcmpFormalLiteral: new Map(), localToStrcasecmpFormalLiteral: new Map(), localToStrncmpFormalLiteral2: new Map(), localToStrncasecmpFormalLiteral2: new Map(), localToStrrevFormal: new Map(), localToStrRepeatFormalLiteral: new Map(), localToStrPadFormalLiteral2: new Map(), localToStringCast: new Map(), localToFloatCast: new Map(), localToBoolCast: new Map(), localToTrimFormal: new Map(), localToStrlenFormal: new Map(), localToEmptyFormal: new Map(), localToIssetFormal: new Map(), localToCountFormal: new Map(), localToIsArrayFormal: new Map(), localToIsStringFormal: new Map(), localToAbsFormal: new Map(), localToIsNumericFormal: new Map(), localToNotFormal: new Map(), localToIsIntFormal: new Map(), localToIsBoolFormal: new Map(), localToIsNullFormal: new Map(), localToNegFormal: new Map(), localToRoundFormal: new Map(), localToFloorFormal: new Map(), localToCeilFormal: new Map(), localToStrtolowerFormal: new Map(), localToStrtoupperFormal: new Map(), localToHtmlspecialcharsFormal: new Map(), localToNl2brFormal: new Map(), localToUrlencodeFormal: new Map(), localToRawurlencodeFormal: new Map(), localToUrldecodeFormal: new Map(), localToRawurldecodeFormal: new Map(), localToLtrimFormal: new Map(), localToRtrimFormal: new Map(), localToIsFloatFormal: new Map(), localToIsObjectFormal: new Map(), localToIsScalarFormal: new Map(), localToUcfirstFormal: new Map(), localToLcfirstFormal: new Map(), localToUcwordsFormal: new Map(), localToStripTagsFormal: new Map(), localToAddslashesFormal: new Map(), localToStripslashesFormal: new Map(), localToStrRot13Formal: new Map(), localToStrWordCountFormal: new Map(), localToHtmlentitiesFormal: new Map(), localToHtmlEntityDecodeFormal: new Map(), localToStrSplitFormalLiteral: new Map(), localToStrcspnFormalLiteral: new Map(), localToStrspnFormalLiteral: new Map(), localToLtrimFormalLiteral: new Map(), localToRtrimFormalLiteral: new Map(), localToTrimFormalLiteral: new Map(), localToStrReplaceFormalLiteral2: new Map(), localToStrIreplaceFormalLiteral2: new Map(), localToWordwrapFormalLiteral2: new Map(), localToChunkSplitFormalLiteral2: new Map(), localToStrtrFormalLiteral2: new Map() };
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
  const localToStrStartsWithFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrEndsWithFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToSubstrCountFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToExplodeFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrcmpFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrcasecmpFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrncmpFormalLiteral2 = new Map<string, { formal: string; needleLiteralId: NodeId; lengthLiteralId: NodeId }>();
  const localToStrncasecmpFormalLiteral2 = new Map<string, { formal: string; needleLiteralId: NodeId; lengthLiteralId: NodeId }>();
  const localToStrrevFormal = new Map<string, string>();
  const localToStrRepeatFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrPadFormalLiteral2 = new Map<string, { formal: string; lengthLiteralId: NodeId; padLiteralId: NodeId }>();
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
  const localToUcfirstFormal = new Map<string, string>();
  const localToLcfirstFormal = new Map<string, string>();
  const localToUcwordsFormal = new Map<string, string>();
  const localToStripTagsFormal = new Map<string, string>();
  const localToAddslashesFormal = new Map<string, string>();
  const localToStripslashesFormal = new Map<string, string>();
  const localToStrRot13Formal = new Map<string, string>();
  const localToStrWordCountFormal = new Map<string, string>();
  const localToHtmlentitiesFormal = new Map<string, string>();
  const localToHtmlEntityDecodeFormal = new Map<string, string>();
  const localToStrSplitFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrcspnFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrspnFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToLtrimFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToRtrimFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToTrimFormalLiteral = new Map<string, { formal: string; literalId: NodeId }>();
  const localToStrReplaceFormalLiteral2 = new Map<string, { formal: string; searchLiteralId: NodeId; replaceLiteralId: NodeId }>();
  const localToStrIreplaceFormalLiteral2 = new Map<string, { formal: string; searchLiteralId: NodeId; replaceLiteralId: NodeId }>();
  const localToWordwrapFormalLiteral2 = new Map<string, { formal: string; widthLiteralId: NodeId; breakLiteralId: NodeId }>();
  const localToChunkSplitFormalLiteral2 = new Map<string, { formal: string; widthLiteralId: NodeId; breakLiteralId: NodeId }>();
  const localToStrtrFormalLiteral2 = new Map<string, { formal: string; fromLiteralId: NodeId; toLiteralId: NodeId }>();
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
      if (resolved.kind === "strStartsWithFormalLiteral") {
        localToStrStartsWithFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strEndsWithFormalLiteral") {
        localToStrEndsWithFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "substrCountFormalLiteral") {
        localToSubstrCountFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "explodeFormalLiteral") {
        localToExplodeFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strcmpFormalLiteral") {
        localToStrcmpFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strcasecmpFormalLiteral") {
        localToStrcasecmpFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strncmpFormalLiteral2") {
        localToStrncmpFormalLiteral2.set(localName, {
          formal: resolved.formal,
          needleLiteralId: resolved.needleLiteralId,
          lengthLiteralId: resolved.lengthLiteralId,
        });
        continue;
      }
      if (resolved.kind === "strncasecmpFormalLiteral2") {
        localToStrncasecmpFormalLiteral2.set(localName, {
          formal: resolved.formal,
          needleLiteralId: resolved.needleLiteralId,
          lengthLiteralId: resolved.lengthLiteralId,
        });
        continue;
      }
      if (resolved.kind === "strRepeatFormalLiteral") {
        localToStrRepeatFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strPadFormalLiteral2") {
        localToStrPadFormalLiteral2.set(localName, {
          formal: resolved.formal,
          lengthLiteralId: resolved.lengthLiteralId,
          padLiteralId: resolved.padLiteralId,
        });
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
      if (resolved.kind === "strrevFormal") {
        localToStrrevFormal.set(localName, resolved.formal);
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
            if (resolved.kind === "ucfirstFormal") {
        localToUcfirstFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "lcfirstFormal") {
        localToLcfirstFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "ucwordsFormal") {
        localToUcwordsFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "stripTagsFormal") {
        localToStripTagsFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "addslashesFormal") {
        localToAddslashesFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "stripslashesFormal") {
        localToStripslashesFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "strRot13Formal") {
        localToStrRot13Formal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "strWordCountFormal") {
        localToStrWordCountFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "htmlentitiesFormal") {
        localToHtmlentitiesFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "htmlEntityDecodeFormal") {
        localToHtmlEntityDecodeFormal.set(localName, resolved.formal);
        continue;
      }
      if (resolved.kind === "strSplitFormalLiteral") {
        localToStrSplitFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strcspnFormalLiteral") {
        localToStrcspnFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strspnFormalLiteral") {
        localToStrspnFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "ltrimFormalLiteral") {
        localToLtrimFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "rtrimFormalLiteral") {
        localToRtrimFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "trimFormalLiteral") {
        localToTrimFormalLiteral.set(localName, { formal: resolved.formal, literalId: resolved.literalId });
        continue;
      }
      if (resolved.kind === "strReplaceFormalLiteral2") {
        localToStrReplaceFormalLiteral2.set(localName, { formal: resolved.formal, searchLiteralId: resolved.searchLiteralId, replaceLiteralId: resolved.replaceLiteralId });
        continue;
      }
      if (resolved.kind === "strIreplaceFormalLiteral2") {
        localToStrIreplaceFormalLiteral2.set(localName, { formal: resolved.formal, searchLiteralId: resolved.searchLiteralId, replaceLiteralId: resolved.replaceLiteralId });
        continue;
      }
      if (resolved.kind === "wordwrapFormalLiteral2") {
        localToWordwrapFormalLiteral2.set(localName, { formal: resolved.formal, widthLiteralId: resolved.widthLiteralId, breakLiteralId: resolved.breakLiteralId });
        continue;
      }
      if (resolved.kind === "chunkSplitFormalLiteral2") {
        localToChunkSplitFormalLiteral2.set(localName, { formal: resolved.formal, widthLiteralId: resolved.widthLiteralId, breakLiteralId: resolved.breakLiteralId });
        continue;
      }
      if (resolved.kind === "strtrFormalLiteral2") {
        localToStrtrFormalLiteral2.set(localName, { formal: resolved.formal, fromLiteralId: resolved.fromLiteralId, toLiteralId: resolved.toLiteralId });
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
  return { queryId, localToFormal, localToLiteral, localToCoalesce, localToRoundFormal2, localToMaxFormalLiteral, localToMinFormalLiteral, localToSubstrFormalLiteral, localToStrposFormalLiteral, localToStriposFormalLiteral, localToStrrposFormalLiteral, localToStrriposFormalLiteral, localToStrContainsFormalLiteral, localToStrStartsWithFormalLiteral, localToStrEndsWithFormalLiteral, localToSubstrCountFormalLiteral, localToExplodeFormalLiteral, localToStrcmpFormalLiteral, localToStrcasecmpFormalLiteral, localToStrncmpFormalLiteral2, localToStrncasecmpFormalLiteral2, localToStrrevFormal, localToStrRepeatFormalLiteral, localToStrPadFormalLiteral2, localToStringCast, localToFloatCast, localToBoolCast, localToTrimFormal, localToStrlenFormal, localToEmptyFormal, localToIssetFormal, localToCountFormal, localToIsArrayFormal, localToIsStringFormal, localToAbsFormal, localToIsNumericFormal, localToNotFormal, localToIsIntFormal, localToIsBoolFormal, localToIsNullFormal, localToNegFormal, localToRoundFormal, localToFloorFormal, localToCeilFormal, localToStrtolowerFormal, localToStrtoupperFormal, localToHtmlspecialcharsFormal, localToNl2brFormal, localToUrlencodeFormal, localToRawurlencodeFormal, localToUrldecodeFormal, localToRawurldecodeFormal, localToLtrimFormal, localToRtrimFormal, localToIsFloatFormal, localToIsObjectFormal, localToIsScalarFormal, localToUcfirstFormal, localToLcfirstFormal, localToUcwordsFormal, localToStripTagsFormal, localToAddslashesFormal, localToStripslashesFormal, localToStrRot13Formal, localToStrWordCountFormal, localToHtmlentitiesFormal, localToHtmlEntityDecodeFormal, localToStrSplitFormalLiteral, localToStrcspnFormalLiteral, localToStrspnFormalLiteral, localToLtrimFormalLiteral, localToRtrimFormalLiteral, localToTrimFormalLiteral, localToStrReplaceFormalLiteral2, localToStrIreplaceFormalLiteral2, localToWordwrapFormalLiteral2, localToChunkSplitFormalLiteral2, localToStrtrFormalLiteral2 };
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
  for (const [local, { formal, literalId }] of extracted.localToStrStartsWithFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const starts = `String(${formalExpr}).startsWith(${litExpr})`;
    subst[local] = starts;
    subst[phpVarKey(local)] = starts;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrEndsWithFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const ends = `String(${formalExpr}).endsWith(${litExpr})`;
    subst[local] = ends;
    subst[phpVarKey(local)] = ends;
  }
  for (const [local, { formal, literalId }] of extracted.localToSubstrCountFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const counted = `((h,l)=>{h=String(h);let c=0,i=0;while((i=h.indexOf(l,i))!==-1){c++;i+=l.length||1}return c})(${formalExpr},${litExpr})`;
    subst[local] = counted;
    subst[phpVarKey(local)] = counted;
  }
  for (const [local, { formal, literalId }] of extracted.localToExplodeFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const exploded = `String(${formalExpr}).split(${litExpr})`;
    subst[local] = exploded;
    subst[phpVarKey(local)] = exploded;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrcmpFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const compared = `((a,b)=>{a=String(a);b=String(b);return a===b?0:a<b?-1:1})(${formalExpr},${litExpr})`;
    subst[local] = compared;
    subst[phpVarKey(local)] = compared;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrcasecmpFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const compared = `((a,b)=>{a=String(a).toLowerCase();b=String(b).toLowerCase();return a===b?0:a<b?-1:1})(${formalExpr},${litExpr})`;
    subst[local] = compared;
    subst[phpVarKey(local)] = compared;
  }
  for (const [local, { formal, needleLiteralId, lengthLiteralId }] of extracted.localToStrncmpFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const needleLit = getNode(ctx.m, needleLiteralId);
    const lengthLit = getNode(ctx.m, lengthLiteralId);
    if (formalExpr === undefined || !needleLit || !lengthLit) return undefined;
    const needleExpr = literalToTsExpr(needleLit);
    const lengthExpr = literalToTsExpr(lengthLit);
    if (needleExpr === undefined || lengthExpr === undefined) return undefined;
    const compared = `((a,b,n)=>{a=String(a).slice(0,n);b=String(b).slice(0,n);return a===b?0:a<b?-1:1})(${formalExpr},${needleExpr},${lengthExpr})`;
    subst[local] = compared;
    subst[phpVarKey(local)] = compared;
  }
  for (const [local, { formal, needleLiteralId, lengthLiteralId }] of extracted.localToStrncasecmpFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const needleLit = getNode(ctx.m, needleLiteralId);
    const lengthLit = getNode(ctx.m, lengthLiteralId);
    if (formalExpr === undefined || !needleLit || !lengthLit) return undefined;
    const needleExpr = literalToTsExpr(needleLit);
    const lengthExpr = literalToTsExpr(lengthLit);
    if (needleExpr === undefined || lengthExpr === undefined) return undefined;
    const compared = `((a,b,n)=>{a=String(a).toLowerCase().slice(0,n);b=String(b).toLowerCase().slice(0,n);return a===b?0:a<b?-1:1})(${formalExpr},${needleExpr},${lengthExpr})`;
    subst[local] = compared;
    subst[phpVarKey(local)] = compared;
  }
  for (const [local, formal] of extracted.localToStrrevFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const reversed = `String(${formalExpr}).split('').reverse().join('')`;
    subst[local] = reversed;
    subst[phpVarKey(local)] = reversed;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrRepeatFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const countLit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !countLit) return undefined;
    const countExpr = literalToTsExpr(countLit);
    if (countExpr === undefined) return undefined;
    const repeated = `String(${formalExpr}).repeat(${countExpr})`;
    subst[local] = repeated;
    subst[phpVarKey(local)] = repeated;
  }
  for (const [local, { formal, lengthLiteralId, padLiteralId }] of extracted.localToStrPadFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lengthLit = getNode(ctx.m, lengthLiteralId);
    const padLit = getNode(ctx.m, padLiteralId);
    if (formalExpr === undefined || !lengthLit || !padLit) return undefined;
    const lengthExpr = literalToTsExpr(lengthLit);
    const padExpr = literalToTsExpr(padLit);
    if (lengthExpr === undefined || padExpr === undefined) return undefined;
    const padded = `String(${formalExpr}).padEnd(${lengthExpr},${padExpr})`;
    subst[local] = padded;
    subst[phpVarKey(local)] = padded;
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
  for (const [local, formal] of extracted.localToUcfirstFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>{s=String(s);return s?s[0].toUpperCase()+s.slice(1):s})(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToLcfirstFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>{s=String(s);return s?s[0].toLowerCase()+s.slice(1):s})(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToUcwordsFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>String(s).replace(/\b\w/g,(c)=>c.toUpperCase()))(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToStripTagsFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `String(${formalExpr}).replace(/<[^>]*>/g,'')`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToAddslashesFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\0/g,'\\0'))(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToStripslashesFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>String(s).replace(/\\(['"\\0])/g,'$1'))(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToStrRot13Formal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>String(s).replace(/[a-zA-Z]/g,(c)=>String.fromCharCode((c<='Z'?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26)))(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToStrWordCountFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>{s=String(s).trim();return s?s.split(/\s+/).filter(Boolean).length:0})(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToHtmlentitiesFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `escapeHtml(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, formal] of extracted.localToHtmlEntityDecodeFormal) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    if (formalExpr === undefined) return undefined;
    const expr = `((s)=>String(s).replace(/&(#\d+|#x[0-9a-fA-F]+|\w+);/g,(m,e)=>{if(e[0]==='#'){const n=e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return Number.isFinite(n)?String.fromCodePoint(n):m}const map={lt:'<',gt:'>',amp:'&',quot:'"',apos:"'"};return map[e]??m}))(${formalExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrSplitFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const expr = `((s,n)=>{s=String(s);const a=[];for(let i=0;i<s.length;i+=n)a.push(s.slice(i,i+n));return a})(${formalExpr},${litExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrcspnFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const expr = `((s,c)=>{s=String(s);let i=0;for(;i<s.length;i++){if(c.includes(s[i]))break}return i})(${formalExpr},${litExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToStrspnFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const expr = `((s,c)=>{s=String(s);let i=0;for(;i<s.length;i++){if(!c.includes(s[i]))break}return i})(${formalExpr},${litExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToLtrimFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const expr = `((s,c)=>{s=String(s);let i=0;while(i<s.length&&c.includes(s[i]))i++;return s.slice(i)})(${formalExpr},${litExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToRtrimFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const expr = `((s,c)=>{s=String(s);let i=s.length;while(i>0&&c.includes(s[i-1]))i--;return s.slice(0,i)})(${formalExpr},${litExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, literalId }] of extracted.localToTrimFormalLiteral) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit = getNode(ctx.m, literalId);
    if (formalExpr === undefined || !lit) return undefined;
    const litExpr = literalToTsExpr(lit);
    if (litExpr === undefined) return undefined;
    const expr = `((s,c)=>{s=String(s);let a=0,b=s.length;while(a<b&&c.includes(s[a]))a++;while(b>a&&c.includes(s[b-1]))b--;return s.slice(a,b)})(${formalExpr},${litExpr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, searchLiteralId, replaceLiteralId }] of extracted.localToStrReplaceFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit2 = getNode(ctx.m, searchLiteralId);
    const lit3 = getNode(ctx.m, replaceLiteralId);
    if (formalExpr === undefined || !lit2 || !lit3) return undefined;
    const lit2Expr = literalToTsExpr(lit2);
    const lit3Expr = literalToTsExpr(lit3);
    if (lit2Expr === undefined || lit3Expr === undefined) return undefined;
    const expr = `String(${formalExpr}).split(${lit2Expr}).join(${lit3Expr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, searchLiteralId, replaceLiteralId }] of extracted.localToStrIreplaceFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit2 = getNode(ctx.m, searchLiteralId);
    const lit3 = getNode(ctx.m, replaceLiteralId);
    if (formalExpr === undefined || !lit2 || !lit3) return undefined;
    const lit2Expr = literalToTsExpr(lit2);
    const lit3Expr = literalToTsExpr(lit3);
    if (lit2Expr === undefined || lit3Expr === undefined) return undefined;
    const expr =
      "((s,search,repl)=>{const esc=String(search).replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');return String(s).replace(new RegExp(esc,'gi'),String(repl))})(" +
      formalExpr +
      "," +
      lit2Expr +
      "," +
      lit3Expr +
      ")";
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, widthLiteralId, breakLiteralId }] of extracted.localToWordwrapFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit2 = getNode(ctx.m, widthLiteralId);
    const lit3 = getNode(ctx.m, breakLiteralId);
    if (formalExpr === undefined || !lit2 || !lit3) return undefined;
    const lit2Expr = literalToTsExpr(lit2);
    const lit3Expr = literalToTsExpr(lit3);
    if (lit2Expr === undefined || lit3Expr === undefined) return undefined;
    const expr = `((s,w,brk)=>{s=String(s);if(!s)return s;const out=[];for(let i=0;i<s.length;i+=w)out.push(s.slice(i,i+w));return out.join(brk)})(${formalExpr},${lit2Expr},${lit3Expr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, widthLiteralId, breakLiteralId }] of extracted.localToChunkSplitFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit2 = getNode(ctx.m, widthLiteralId);
    const lit3 = getNode(ctx.m, breakLiteralId);
    if (formalExpr === undefined || !lit2 || !lit3) return undefined;
    const lit2Expr = literalToTsExpr(lit2);
    const lit3Expr = literalToTsExpr(lit3);
    if (lit2Expr === undefined || lit3Expr === undefined) return undefined;
    const expr = `((s,w,sep)=>{s=String(s);if(!s)return s;const out=[];for(let i=0;i<s.length;i+=w)out.push(s.slice(i,i+w));return out.join(sep)+sep})(${formalExpr},${lit2Expr},${lit3Expr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
  }
  for (const [local, { formal, fromLiteralId, toLiteralId }] of extracted.localToStrtrFormalLiteral2) {
    const formalExpr = subst[formal] ?? subst[phpVarKey(formal)];
    const lit2 = getNode(ctx.m, fromLiteralId);
    const lit3 = getNode(ctx.m, toLiteralId);
    if (formalExpr === undefined || !lit2 || !lit3) return undefined;
    const lit2Expr = literalToTsExpr(lit2);
    const lit3Expr = literalToTsExpr(lit3);
    if (lit2Expr === undefined || lit3Expr === undefined) return undefined;
    const expr = `((s,from,to)=>{s=String(s);const m=new Map();for(let i=0;i<from.length;i++)m.set(from[i],to[i]??from[i]);return s.split('').map((ch)=>m.has(ch)?m.get(ch):ch).join('')})(${formalExpr},${lit2Expr},${lit3Expr})`;
    subst[local] = expr;
    subst[phpVarKey(local)] = expr;
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
