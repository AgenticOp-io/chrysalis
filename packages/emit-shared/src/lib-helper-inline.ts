/**
 * Emit-time inlining and lowered lib helper modules (mirrors ingest B5.5, G2318).
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import { stringLit } from "./ts-util.js";

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
  if (callee === "strlen" || callee === "intval" || callee === "trim" || callee === "empty" || callee === "isset") {
    return stmt.effects.length === 0;
  }
  return false;
}

export function tryExtractInlineQuery(
  m: Module,
  bodyId: NodeId,
  paramNames: readonly string[],
): { queryId: NodeId; localToFormal: ReadonlyMap<string, string> } | undefined {
  const body = getNode(m, bodyId);
  if (!body || body.dialect !== "data" || body.op !== "block") return undefined;
  const stmts = body.operands;
  if (stmts.length === 0) return undefined;
  const queryId = queryFromReturnStmt(m, stmts[stmts.length - 1]!);
  if (queryId === undefined) return undefined;
  if (stmts.length === 1) {
    return { queryId, localToFormal: new Map() };
  }
  const localToFormal = new Map<string, string>();
  for (let i = 0; i < stmts.length - 1; i++) {
    const stmtId = stmts[i]!;
    const stmt = getNode(m, stmtId);
    if (!stmt) return undefined;
    if (stmt.op === "call" && stmt.attrs.callee === "__assign") {
      const targetLit = getNode(m, stmt.operands[0]!);
      const valueId = stmt.operands[1]!;
      if (!targetLit || targetLit.op !== "literal") return undefined;
      const localName = phpVarKey(String(targetLit.attrs.value ?? ""));
      const valueNode = getNode(m, valueId);
      if (!valueNode || valueNode.op !== "param") return undefined;
      const srcName = String(valueNode.attrs.name ?? "");
      const formal =
        matchFormalParam(srcName, paramNames) ??
        localToFormal.get(phpVarKey(srcName)) ??
        localToFormal.get(srcName);
      if (formal === undefined) return undefined;
      localToFormal.set(localName, formal);
      continue;
    }
    if (stmt.op === "hole") return undefined;
    if (stmt.effects.length > 0) return undefined;
    if (isSkippablePreludeExprStmt(m, stmt)) continue;
    return undefined;
  }
  return { queryId, localToFormal };
}

export function resolveHelperBodyEntry(
  bodies: NonNullable<Module["meta"]["helperBodies"]>,
  callee: string,
): { readonly bodyId: NodeId; readonly paramNames: readonly string[] } | undefined {
  const direct = bodies[callee];
  if (direct !== undefined) return direct;
  if (callee.includes("::")) {
    for (const [key, entry] of Object.entries(bodies)) {
      if (key === callee || key.endsWith("\\" + callee)) return entry;
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
    const exportName = callee.includes("\\") ? callee.slice(callee.lastIndexOf("\\") + 1) : callee;
    if (!out.includes(exportName)) out.push(exportName);
  }
  return out.sort();
}
