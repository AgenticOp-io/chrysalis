/**
 * `parameterize-sql` pass — fixes SQL-injection opportunities reported
 * by the `raw-sql-concat` recognizer.
 *
 * Strategy (see DESIGN.md D17):
 *   1. Read the `sqlExpr` attr that ingest stashed on the `effect.db.query`
 *      node when its SQL wasn't a string literal at the call site.
 *   2. Walk the expression tree, treating `data.concat` and PHP
 *      `.`-binops as container nodes. Each leaf is classified:
 *        - a `data.literal` of kind `string` → inlined into the rebuilt
 *          literal SQL string verbatim
 *        - anything else → emitted as a `?` placeholder, and the node
 *          itself is appended to the db.query's `operands` (bound params)
 *   3. Replace the `effect.db.query` node in place (same NodeId) with a
 *      patched version: `sql` set to the newly-literal SQL, `operands`
 *      extended with the lifted params, and the `sqlExpr` attr removed
 *      (it's no longer the source of truth).
 *
 * Why this is safe by construction: the emitted SQL string contains
 * only characters the developer already wrote as literals, plus `?`
 * placeholders. The attacker-controlled values are passed via the
 * params array, which the emit backend lowers to `node:sqlite`
 * prepared-statement bindings — SQLi is structurally impossible.
 *
 * Idempotency: after the rewrite, `sql` is literal text and `sqlExpr`
 * is gone, so `raw-sql-concat` no longer fires on the same query.
 *
 * Composition with `sanitize-output`: the two passes target different
 * recognizers (SQLi vs XSS) and different sink kinds (db.query vs
 * echo/html.template), so in practice they don't overlap on the same
 * nodes. The per-opportunity apply-verify-commit loop (D16) handles
 * any cross-pass interactions correctly.
 *
 * Corpus gating (D200): same confidence model as `batch-n1-read` — applies only
 * when `corpusConfirmations >= 1` or `observedMaxPerRequest >= 2` (attached by
 * `boostRawSqlConcat` when traces include matching-route SQL, or injected in tests).
 */
import type { NodeBase, NodeId } from "@chrysalis/webir";
import { T } from "@chrysalis/webir";
import type { Opportunity } from "@chrysalis/insight";
import type { Edit, RewriteCtx, RewritePass } from "../framework.js";

export const parameterizeSqlPass: RewritePass = {
  id: "parameterize-sql",
  name: "Parameterize dynamic SQL",

  handles(op: Opportunity): boolean {
    return op.recognizer === "raw-sql-concat";
  },

  apply(ctx: RewriteCtx, op: Opportunity): ReadonlyArray<Edit> {
    const corpusHits = Number(op.evidence["corpusConfirmations"] ?? 0);
    const maxPerReq = Number(op.evidence["observedMaxPerRequest"] ?? 0);
    if (!(Number.isFinite(corpusHits) && corpusHits >= 1) && !(Number.isFinite(maxPerReq) && maxPerReq >= 2)) {
      throw new Error(
        "parameterize-sql: corpus gating requires trace-backed SQL evidence on this route (run insight/rewrite with --traces)",
      );
    }
    const queryId = op.nodes[0];
    if (!queryId) throw new Error("parameterize-sql: opportunity has no anchor node");
    const query = ctx.get(queryId);
    if (!query || query.dialect !== "effect" || query.op !== "db.query") {
      throw new Error("parameterize-sql: anchor is not an effect.db.query");
    }
    const attrs = query.attrs as Record<string, unknown>;
    const sqlExprId = attrs["sqlExpr"] as NodeId | undefined;
    if (!sqlExprId) {
      // Without the preserved expression tree we can't recover leaf
      // identities, so there's nothing to lift. This is a no-op, not
      // a bug — the module came from an older ingest that dropped the
      // tree. The driver will record it as skipped with this reason.
      throw new Error("parameterize-sql: db.query has no sqlExpr attr; re-ingest required");
    }
    const root = ctx.get(sqlExprId);
    if (!root) throw new Error("parameterize-sql: sqlExpr node not found in module");

    const liftedParams: NodeId[] = [];
    const rebuiltSql = renderExpr(ctx, root, liftedParams);

    // Nothing to do if we failed to extract anything useful (e.g. the
    // tree was a single literal — unlikely, but keeps the pass honest).
    if (liftedParams.length === 0 && rebuiltSql.trim() === "") {
      throw new Error("parameterize-sql: nothing extractable from sqlExpr");
    }

    const newAttrs: Record<string, unknown> = { ...attrs, sql: rebuiltSql };
    delete newAttrs["sqlExpr"];

    const newOperands = Object.freeze([...query.operands, ...liftedParams]);
    const patched: NodeBase = {
      ...query,
      operands: newOperands,
      attrs: newAttrs,
      provenance: [
        ...query.provenance,
        ctx.provenance(`parameterize-sql lift from ${op.id}`),
      ],
    };
    return [{ kind: "add", node: patched }];
  },

  // The pass mutates exactly one node class — `effect.db.query` — and
  // reads from the sqlExpr tree without mutating those nodes (they
  // stay in the module but become orphaned references). Any mutation
  // to a redirect, echo, session write, or cookie would be a bug and
  // the invariant system will roll it back.
  invariants: {
    mayModify: ["effect.db.query"],
  },
};

/**
 * Recursively render an expression tree back into SQL text, collecting
 * non-literal leaves into `params` as `?` placeholders.
 */
function renderExpr(
  ctx: RewriteCtx,
  n: NodeBase,
  params: NodeId[],
): string {
  // Concat-like containers: recurse into each operand and join.
  if (isConcatLike(n)) {
    let out = "";
    for (const opId of n.operands) {
      const child = ctx.get(opId);
      if (!child) {
        params.push(opId);
        out += "?";
        continue;
      }
      out += renderExpr(ctx, child, params);
    }
    return out;
  }
  // Literal leaf: inline as SQL text. Numbers and booleans are
  // deliberately stringified the way PHP would serialize them into a
  // concatenation (`(string)$x`); this matches what the original
  // dynamic SQL would have produced for developer-written literals.
  if (n.dialect === "data" && n.op === "literal") {
    const value = (n.attrs as { value?: unknown }).value;
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return String(value);
  }
  // Any other expression: lift as a bound parameter.
  params.push(n.id);
  return "?";
}

function isConcatLike(n: NodeBase): boolean {
  if (n.dialect !== "data") return false;
  if (n.op === "concat") return true;
  if (n.op === "binop" && (n.attrs as { operator?: string }).operator === ".") return true;
  return false;
}

// Build a string literal node for the rebuilt SQL. Currently unused
// because we bake the SQL into the db.query node's `sql` attr rather
// than routing it through an operand, but exported for the future
// branch where SQL becomes a first-class operand.
export function makeSqlLiteral(ctx: RewriteCtx, sql: string): NodeBase {
  return {
    id: ctx.allocId(),
    dialect: "data",
    op: "literal",
    type: T.string,
    effects: [],
    operands: [],
    attrs: { value: sql },
    origin: ctx.synthetic("parameterize-sql literal"),
    provenance: [ctx.provenance("parameterize-sql")],
  };
}
