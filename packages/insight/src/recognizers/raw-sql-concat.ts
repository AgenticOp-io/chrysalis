/**
 * `raw-sql-concat` recognizer — SQL injection.
 *
 * Flags any `effect.db.query` whose SQL was built by string concatenation
 * at the call site, rather than passed as a literal with bound parameters.
 *
 * Detection is precise *in the IR*: ingest (see `convert.ts` under the
 * `dbQuery` lowering) stores the literal SQL string when the first
 * argument is a `Literal` of kind `string`, and stores `"<dynamic>"`
 * otherwise. A `"<dynamic>"` marker means the developer computed the
 * query text at runtime — concatenation, `sprintf`, or a helper — and is
 * therefore an injection risk whenever attacker-controllable data flows
 * into the handler. The corpus boost can later confirm that a tainted
 * value actually reached the query's bound params position.
 *
 * We pair the syntactic signal with the taint primitive so that a
 * `"<dynamic>"` query in a handler that receives no request/session data
 * is reported at lower confidence than one that does.
 */
import type { Module } from "@chrysalis/webir";
import type { Opportunity, Recognizer } from "../framework.js";
import { collectBindings, descendants, routes } from "../walk.js";
import { computeTaint } from "../taint.js";

const RECOGNIZER_ID = "raw-sql-concat" as const;

export const rawSqlConcatRecognizer: Recognizer = {
  id: RECOGNIZER_ID,
  name: "Raw SQL concatenation",
  description:
    "A database query is built by string concatenation (or sprintf) at the call site rather than passed as a parameterized literal. Combined with any tainted data in the handler, this is a direct SQL injection.",

  recognize(m: Module): ReadonlyArray<Opportunity> {
    const out: Opportunity[] = [];

    for (const route of routes(m)) {
      const bindings = collectBindings(m, route.bodyNode.id);
      const { taint, sources } = computeTaint(m, route.bodyNode.id, bindings);

      const handlerHasTaintedInput = hasAttackerSource(m, sources, taint);

      for (const n of descendants(m, route.bodyNode.id)) {
        if (n.dialect !== "effect" || n.op !== "db.query") continue;
        const sql = (n.attrs as { sql?: string }).sql ?? "";
        const isDynamic = sql === "<dynamic>";
        const anyParamTainted = n.operands.some((p) => taint.get(p) === "tainted");

        if (!isDynamic && !anyParamTainted) continue;
        if (!isDynamic) continue; // parameterized + tainted params = safe (what bound params are for)

        const tables = (n.attrs as { tables?: ReadonlyArray<string> }).tables ?? [];
        const kind = (n.attrs as { kind?: string }).kind ?? "read";
        const severity = handlerHasTaintedInput ? "strong" : "suggestion";
        const confidence = handlerHasTaintedInput ? 0.85 : 0.55;
        const id = `${RECOGNIZER_ID}:${route.method}:${route.path}:${String(n.id)}`;
        out.push({
          recognizer: RECOGNIZER_ID,
          id,
          title: `Dynamic SQL in ${kind} of ${tables.length ? tables.join(",") : "<unknown>"}`,
          severity,
          confidence,
          nodes: [n.id, ...n.operands],
          origin: n.origin,
          route: { method: route.method, path: route.path },
          rationale:
            "SQL string is built at runtime rather than passed as a literal with bound parameters; combined with any request/session data in this handler, this is a direct SQL injection vector.",
          proposedLift: {
            kind: "parameterize-query",
            sketch:
              "Rewrite the call so the SQL is a literal string with `?` placeholders, and pass attacker-controllable values via the params array (or switch to a query builder / Drizzle). The Hono emitter already uses `node:sqlite` prepared statements for literal-SQL call sites.",
          },
          evidence: {
            tables,
            kind,
            handlerHasTaintedInput,
            dynamicSqlMarker: sql,
          },
        });
      }
    }

    return out;
  },
};

/**
 * True if any source node (classified as tainted) is specifically an
 * *external* input — a request field or session read. The query's own
 * return value is also tracked as a source for provenance, but it's not
 * by itself an attacker-controlled channel.
 */
function hasAttackerSource(
  m: Module,
  sources: ReadonlySet<import("@chrysalis/webir").NodeId>,
  taint: ReadonlyMap<import("@chrysalis/webir").NodeId, "clean" | "tainted">,
): boolean {
  for (const s of sources) {
    if (taint.get(s) !== "tainted") continue;
    const node = m.nodes.get(s);
    if (!node) continue;
    if (node.dialect === "data" && node.op === "request.field") return true;
    if (node.dialect === "effect" && node.op === "session.read") return true;
  }
  return false;
}
