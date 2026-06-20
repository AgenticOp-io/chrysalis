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
  if (callee === "strlen" || callee === "intval" || callee === "trim" || callee === "empty" || callee === "isset" || callee === "count" || callee === "is_array" || callee === "is_string" || callee === "abs") {
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
): { kind: "formal"; formal: string } | { kind: "literal"; id: NodeId } | { kind: "coalesce"; formal: string; literalId: NodeId } | { kind: "stringCast"; formal: string } | { kind: "floatCast"; formal: string } | { kind: "boolCast"; formal: string } | { kind: "trimFormal"; formal: string } | { kind: "strlenFormal"; formal: string } | { kind: "emptyFormal"; formal: string } | { kind: "issetFormal"; formal: string } | { kind: "countFormal"; formal: string } | { kind: "isArrayFormal"; formal: string } | { kind: "isStringFormal"; formal: string } | { kind: "absFormal"; formal: string } | undefined {
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
} | undefined {
  const body = getNode(m, bodyId);
  if (!body || body.dialect !== "data" || body.op !== "block") return undefined;
  const stmts = body.operands;
  if (stmts.length === 0) return undefined;
  const queryId = queryFromReturnStmt(m, stmts[stmts.length - 1]!);
  if (queryId === undefined) return undefined;
  if (stmts.length === 1) {
    return { queryId, localToFormal: new Map(), localToLiteral: new Map(), localToCoalesce: new Map(), localToStringCast: new Map(), localToFloatCast: new Map(), localToBoolCast: new Map(), localToTrimFormal: new Map(), localToStrlenFormal: new Map(), localToEmptyFormal: new Map(), localToIssetFormal: new Map(), localToCountFormal: new Map(), localToIsArrayFormal: new Map(), localToIsStringFormal: new Map(), localToAbsFormal: new Map() };
  }
  const localToFormal = new Map<string, string>();
  const localToLiteral = new Map<string, NodeId>();
  const localToCoalesce = new Map<string, { formal: string; literalId: NodeId }>();
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
      localToFormal.set(localName, resolved.formal);
      continue;
    }
    if (stmt.op === "hole") return undefined;
    if (stmt.effects.length > 0) return undefined;
    if (isSkippablePreludeExprStmt(m, stmt)) continue;
    return undefined;
  }
  return { queryId, localToFormal, localToLiteral, localToCoalesce, localToStringCast, localToFloatCast, localToBoolCast, localToTrimFormal, localToStrlenFormal, localToEmptyFormal, localToIssetFormal, localToCountFormal, localToIsArrayFormal, localToIsStringFormal, localToAbsFormal };
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
