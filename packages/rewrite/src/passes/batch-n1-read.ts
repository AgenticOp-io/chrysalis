/**
 * `batch-n1-read` — collapse a single inner `effect.db.query` inside a foreach
 * into one `__chrysalis_query_all_where_in` before the loop plus
 * `__chrysalis_row_by_column` inside the loop (D42).
 *
 * Preconditions (v1):
 * - Opportunity from `n-plus-one-queries` with exactly one inner read.
 * - Foreach iterable is a `data.param` (outer rows already bound to a variable).
 * - Inner query is `returns: row-or-null` with one bound param.
 * - Param is `data.member` on `data.param` whose name matches the foreach value.
 * - Inner SQL matches `SELECT ... FROM tbl WHERE col = ?` (no `SELECT *`).
 */
import type { NodeBase, NodeId, WebIRType } from "@chrysalis/webir";
import { T } from "@chrysalis/webir";
import type { Opportunity } from "@chrysalis/insight";
import type { Edit, RewriteCtx, RewritePass } from "../framework.js";
import { makeDataCall } from "../framework.js";

const DEFAULT_EFFECTS_TO_PRESERVE = [
  "effect.echo",
  "effect.db.exec",
  "effect.session.write",
  "effect.session.destroy",
  "effect.http.response",
  "effect.http.redirect",
  "effect.http.header",
  "effect.cookie.set",
  "effect.cookie.delete",
] as const;

function parseInnerLookupSql(sql: string):
  | { selectList: string; table: string; whereCol: string }
  | undefined {
  const s = sql.replace(/\s+/g, " ").trim();
  const m = s.match(/^select\s+(.+?)\s+from\s+(\w+)\s+where\s+(\w+)\s*=\s*\?\s*$/i);
  if (!m) return undefined;
  const selectList = m[1]!.trim();
  if (selectList === "*") return undefined;
  return { selectList, table: m[2]!.trim(), whereCol: m[3]!.trim() };
}

function selectListForBatch(selectList: string, whereCol: string): string {
  const re = new RegExp(`\\b${whereCol.replace(/[^a-z0-9_]/gi, "")}\\b`, "i");
  return re.test(selectList) ? selectList : `${whereCol}, ${selectList}`;
}

function sanitizeIdentPart(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24) || "t";
}

function findForeach(m: ModuleFromCtx, op: Opportunity): NodeBase | undefined {
  for (const id of op.nodes) {
    const n = m.nodes.get(id);
    if (n?.dialect === "data" && n.op === "foreach") return n;
  }
  return undefined;
}

type ModuleFromCtx = RewriteCtx["module"];

function iterableParamName(m: ModuleFromCtx, fe: NodeBase): string | undefined {
  const it = fe.operands[0];
  if (!it) return undefined;
  const n = m.nodes.get(it);
  if (n?.dialect === "data" && n.op === "param") {
    return String((n.attrs as { name: string }).name);
  }
  return undefined;
}

function routeBodyId(m: ModuleFromCtx, op: Opportunity): NodeId | undefined {
  for (const rid of m.roots) {
    const route = m.nodes.get(rid);
    if (!route || route.dialect !== "web.request" || route.op !== "route") continue;
    const attrs = route.attrs as { method?: string; path?: string };
    if (attrs.method !== op.route?.method || attrs.path !== op.route?.path) continue;
    const handlerId = route.operands[0];
    const handler = handlerId ? m.nodes.get(handlerId) : undefined;
    const bodyId = handler?.operands[0];
    return bodyId;
  }
  return undefined;
}

function findForeachInBlock(
  m: ModuleFromCtx,
  blockId: NodeId,
  foreachId: NodeId,
): { blockId: NodeId; foreachIndex: number } | undefined {
  const b = m.nodes.get(blockId);
  if (!b || b.op !== "block") return undefined;
  for (let i = 0; i < b.operands.length; i++) {
    if (b.operands[i] === foreachId) return { blockId: b.id, foreachIndex: i };
  }
  for (const oid of b.operands) {
    const n = m.nodes.get(oid);
    if (n?.op === "foreach" && n.operands[1]) {
      const inner = findForeachInBlock(m, n.operands[1]!, foreachId);
      if (inner) return inner;
    }
    if (n?.op === "block") {
      const inner = findForeachInBlock(m, n.id, foreachId);
      if (inner) return inner;
    }
  }
  return undefined;
}

function firstInnerReadStmt(m: ModuleFromCtx, bodyId: NodeId): NodeBase | undefined {
  const b = m.nodes.get(bodyId);
  if (!b || b.op !== "block") return undefined;
  for (const sid of b.operands) {
    const n = m.nodes.get(sid);
    if (!n) continue;
    if (n.op === "call" && (n.attrs as { callee?: string }).callee === "__assign") {
      const rhs = n.operands[1];
      const rhsN = rhs ? m.nodes.get(rhs) : undefined;
      if (
        rhsN?.dialect === "effect" &&
        rhsN.op === "db.query" &&
        (rhsN.attrs as { kind?: string }).kind === "read"
      ) {
        return rhsN;
      }
    }
    if (
      n.dialect === "effect" &&
      n.op === "db.query" &&
      (n.attrs as { kind?: string }).kind === "read"
    ) {
      return n;
    }
  }
  return undefined;
}

function findAssignForRhs(m: ModuleFromCtx, bodyId: NodeId, rhsId: NodeId): NodeBase | undefined {
  const b = m.nodes.get(bodyId);
  if (!b || b.op !== "block") return undefined;
  for (const sid of b.operands) {
    const n = m.nodes.get(sid);
    if (
      n?.op === "call" &&
      (n.attrs as { callee?: string }).callee === "__assign" &&
      n.operands[1] === rhsId
    ) {
      return n;
    }
  }
  return undefined;
}

function unwrapMemberParam(
  m: ModuleFromCtx,
  nodeId: NodeId,
  loopVar: string,
): { memberNodeId: NodeId; fkKey: string } | undefined {
  let cur: NodeId | undefined = nodeId;
  for (let depth = 0; depth < 4 && cur; depth++) {
    const n = m.nodes.get(cur);
    if (!n) return undefined;
    if (n.op === "member") {
      const obj = n.operands[0];
      const key = (n.attrs as { key?: string }).key;
      if (typeof key !== "string" || !obj) return undefined;
      const objN = m.nodes.get(obj);
      if (
        objN?.dialect === "data" &&
        objN.op === "param" &&
        String((objN.attrs as { name: string }).name) === loopVar
      ) {
        return { memberNodeId: cur, fkKey: key };
      }
      return undefined;
    }
    if (n.op === "call") {
      const cast = (n.attrs as { callee?: string }).callee;
      if (cast === "__cast_int" || cast === "intval") {
        cur = n.operands[0];
        continue;
      }
    }
    return undefined;
  }
  return undefined;
}

export const batchN1ReadPass: RewritePass = {
  id: "batch-n1-read",
  name: "Batch single inner read in foreach",

  handles(op: Opportunity): boolean {
    if (op.recognizer !== "n-plus-one-queries") return false;
    if (op.evidence["innerQueriesInLoop"] !== 1) return false;
    return true;
  },

  apply(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
    const m = ctx.module;
    const fe = findForeach(m, op);
    if (!fe) throw new Error("batch-n1-read: foreach not in opportunity nodes");

    const loopVar = String(
      (fe.attrs as { valueName?: string }).valueName ?? op.evidence["loopVar"] ?? "row",
    );
    const iterableName = iterableParamName(m, fe);
    if (!iterableName) {
      throw new Error("batch-n1-read: foreach iterable must be a simple param (bind outer query first)");
    }

    const bodyId = fe.operands[1];
    if (!bodyId) throw new Error("batch-n1-read: foreach has no body");

    const inner = firstInnerReadStmt(m, bodyId);
    if (!inner) throw new Error("batch-n1-read: no inner read in loop body");

    const attrs = inner.attrs as {
      kind?: string;
      sql?: string;
      returns?: string;
    };
    if (attrs.kind !== "read" || attrs.returns !== "row-or-null") {
      throw new Error("batch-n1-read: inner query must be a read returning row-or-null");
    }

    const parsed = parseInnerLookupSql(attrs.sql ?? "");
    if (!parsed) {
      throw new Error("batch-n1-read: inner SQL must look like SELECT cols FROM t WHERE col = ? (no SELECT *)");
    }

    const params = inner.operands;
    if (params.length !== 1) {
      throw new Error("batch-n1-read: inner query must have exactly one bound parameter");
    }

    const member = unwrapMemberParam(m, params[0]!, loopVar);
    if (!member) {
      throw new Error("batch-n1-read: inner param must be member(loopVar, fkColumn)");
    }

    const assign = findAssignForRhs(m, bodyId, inner.id);
    if (!assign) {
      throw new Error("batch-n1-read: inner db.query must be rhs of __assign");
    }

    const assignNameLit = m.nodes.get(assign.operands[0]!);
    if (assignNameLit?.op !== "literal") {
      throw new Error("batch-n1-read: __assign target name not a literal");
    }

    const routeBody = routeBodyId(m, op);
    if (!routeBody) throw new Error("batch-n1-read: could not locate route body");

    const parent = findForeachInBlock(m, routeBody, fe.id);
    if (!parent) throw new Error("batch-n1-read: foreach not nested under route body");

    const block = m.nodes.get(parent.blockId);
    if (!block || block.op !== "block") throw new Error("batch-n1-read: parent not a block");

    const tbl = sanitizeIdentPart(parsed.table);
    const idsVar = `__chrysalisN1Ids_${tbl}`;
    const rowsVar = `__chrysalisN1Rows_${tbl}`;
    const batchSelect = selectListForBatch(parsed.selectList, parsed.whereCol);

    const edits: Edit[] = [];

    const iterableParamId = fe.operands[0]!;
    const fkLit = literalNode(ctx, member.fkKey, T.string);
    edits.push({ kind: "add", node: fkLit });

    const pluckCall = makeDataCall(
      ctx,
      "__chrysalis_pluck",
      [iterableParamId, fkLit.id],
      T.unknown,
      "batch-n1-read pluck",
    );
    edits.push({ kind: "add", node: pluckCall });

    const idsNameLit = literalNode(ctx, idsVar, T.string);
    edits.push({ kind: "add", node: idsNameLit });
    const assignIds = makeDataCall(ctx, "__assign", [idsNameLit.id, pluckCall.id], T.void, "batch-n1-read assign ids");
    edits.push({ kind: "add", node: assignIds });

    const selLit = literalNode(ctx, batchSelect, T.string);
    const tableLit = literalNode(ctx, parsed.table, T.string);
    const whereLit = literalNode(ctx, parsed.whereCol, T.string);
    const idsRead = paramNode(ctx, idsVar);
    edits.push({ kind: "add", node: selLit });
    edits.push({ kind: "add", node: tableLit });
    edits.push({ kind: "add", node: whereLit });
    edits.push({ kind: "add", node: idsRead });

    const batchCall = makeDataCall(
      ctx,
      "__chrysalis_query_all_where_in",
      [selLit.id, tableLit.id, whereLit.id, idsRead.id],
      T.unknown,
      "batch-n1-read batch query",
    );
    edits.push({ kind: "add", node: batchCall });

    const rowsNameLit = literalNode(ctx, rowsVar, T.string);
    edits.push({ kind: "add", node: rowsNameLit });
    const assignRows = makeDataCall(ctx, "__assign", [rowsNameLit.id, batchCall.id], T.void, "batch-n1-read assign rows");
    edits.push({ kind: "add", node: assignRows });

    const whereColForLookup = literalNode(ctx, parsed.whereCol, T.string);
    const rowsParam = paramNode(ctx, rowsVar);
    edits.push({ kind: "add", node: whereColForLookup });
    edits.push({ kind: "add", node: rowsParam });

    const rowLookup = makeDataCall(
      ctx,
      "__chrysalis_row_by_column",
      [rowsParam.id, whereColForLookup.id, member.memberNodeId],
      T.unknown,
      "batch-n1-read row lookup",
    );
    edits.push({ kind: "add", node: rowLookup });

    const newOps = [...block.operands];
    newOps.splice(parent.foreachIndex, 0, assignIds.id, assignRows.id);
    const patchedBlock: NodeBase = {
      ...block,
      operands: Object.freeze(newOps),
      provenance: [...block.provenance, ctx.provenance("batch-n1-read: hoist batch assigns")],
    };
    edits.push({ kind: "add", node: patchedBlock });

    edits.push({
      kind: "replaceOperand",
      nodeId: assign.id,
      index: 1,
      newOperandId: rowLookup.id,
    });

    return edits;
  },

  invariants: {
    mayModify: ["data.block", "data.call"],
    preserveEffectCounts: [...DEFAULT_EFFECTS_TO_PRESERVE],
  },
};

function literalNode(ctx: RewriteCtx, value: string, type: WebIRType): NodeBase {
  return {
    id: ctx.allocId(),
    dialect: "data",
    op: "literal",
    type,
    effects: [],
    operands: [],
    attrs: { value },
    origin: ctx.synthetic("batch-n1-read literal"),
    provenance: [ctx.provenance("batch-n1-read literal")],
  };
}

function paramNode(ctx: RewriteCtx, name: string): NodeBase {
  return {
    id: ctx.allocId(),
    dialect: "data",
    op: "param",
    type: T.unknown,
    effects: [],
    operands: [],
    attrs: { name },
    origin: ctx.synthetic("batch-n1-read param"),
    provenance: [ctx.provenance("batch-n1-read param")],
  };
}
