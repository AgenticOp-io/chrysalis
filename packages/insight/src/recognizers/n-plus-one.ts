/**
 * N+1 query recognizer.
 *
 * Shape we're after on the IR:
 *
 *   foreach (iterable = <outer-row-producing-expr>, body = {
 *     ...
 *     effect.db.query(kind=read, ...)        <- the inner per-row read
 *     ...
 *   })
 *
 * We additionally try to identify the outer query that produced the iterable
 * (often a sibling `effect.db.query` whose result feeds the foreach). When we
 * find both, confidence is higher and the rewrite sketch is sharper (we can
 * propose a single IN(...) batch load keyed on the outer row's FK).
 *
 * This recognizer stays pure over the IR. The runner then cross-references
 * the trace corpus to confirm that the inner query actually fires many times
 * per request, turning a `suggestion` into a `strong` finding.
 */
import type { Module, NodeBase, NodeId } from "@chrysalis/webir";
import type { Opportunity, Recognizer } from "../framework.js";
import { canonicalSql } from "../framework.js";
import {
  anyDescendant,
  collectBindings,
  descendants,
  findDescendants,
  resolveBinding,
  routes,
} from "../walk.js";

const RECOGNIZER_ID = "n-plus-one-queries" as const;

export const nPlusOneRecognizer: Recognizer = {
  id: RECOGNIZER_ID,
  name: "N+1 query pattern",
  description:
    "A foreach loop whose body issues one or more database reads per iteration. Likely rewritable as a single batched IN(...) query with an in-memory lookup map.",

  recognize(m: Module): ReadonlyArray<Opportunity> {
    const out: Opportunity[] = [];

    for (const route of routes(m)) {
      const foreaches = findDescendants(
        m,
        route.bodyNode.id,
        (n) => n.dialect === "data" && n.op === "foreach",
      );
      const bindings = collectBindings(m, route.bodyNode.id);

      for (const fe of foreaches) {
        // Body of a `data.foreach` is operand[1]. See webir/dialects/data.ts.
        const iterableId = fe.operands[0];
        const bodyId = fe.operands[1];
        if (!iterableId || !bodyId) continue;

        // Collect inner db.query effects inside the body. Using the body
        // subtree (not the whole foreach) so we don't double-count the
        // outer query that feeds the iterable when they share a subtree.
        const innerQueries = findDescendants(
          m,
          bodyId,
          (n) =>
            n.dialect === "effect" &&
            n.op === "db.query" &&
            (n.attrs as { kind?: string }).kind === "read",
        );
        if (innerQueries.length === 0) continue;

        // Best candidate: the first inner read query. Multiple inner reads
        // compound the problem but the first is what we report against.
        const inner = innerQueries[0]!;
        const resolvedIterable = resolveBinding(m, bindings, iterableId);
        const outer =
          findFeedingQuery(m, iterableId) ??
          (resolvedIterable ? findFeedingQuery(m, resolvedIterable.id) : undefined);
        const evidence: Record<string, unknown> = {
          innerSql: (inner.attrs as { sql?: string }).sql ?? "",
          innerSqlCanonical: canonicalSql(
            (inner.attrs as { sql?: string }).sql ?? "",
          ),
          innerTables: (inner.attrs as { tables?: ReadonlyArray<string> }).tables ?? [],
          innerQueriesInLoop: innerQueries.length,
        };
        if (outer) {
          evidence["outerSql"] = (outer.attrs as { sql?: string }).sql ?? "";
          evidence["outerSqlCanonical"] = canonicalSql(
            (outer.attrs as { sql?: string }).sql ?? "",
          );
          evidence["outerTables"] =
            (outer.attrs as { tables?: ReadonlyArray<string> }).tables ?? [];
        }
        evidence["loopVar"] = (fe.attrs as { valueName?: string }).valueName ?? "row";

        // All nodes in this opportunity's subgraph — useful for a rewriter.
        const nodeSet = new Set<NodeId>();
        for (const d of descendants(m, fe.id)) nodeSet.add(d.id);

        const id = `${RECOGNIZER_ID}:${route.method}:${route.path}:${String(fe.id)}`;
        const sketch = outer
          ? "Collapse the per-row read into one `SELECT ... WHERE <fk> IN (?, ?, ...)` issued before the loop, then build a Map<fk, row> and look up each outer row's join inside the loop."
          : "Hoist the per-row read out of the loop: batch the keys, issue one `SELECT ... WHERE <key> IN (?, ?, ...)`, and look up results from a Map.";
        out.push({
          recognizer: RECOGNIZER_ID,
          id,
          title: outer
            ? `N+1: ${(inner.attrs as { sql?: string }).sql ?? "inner query"} fires once per outer row`
            : `N+1: per-iteration DB read inside foreach ${(fe.attrs as { valueName?: string }).valueName ?? ""}`.trim(),
          severity: "suggestion",
          confidence: outer ? 0.7 : 0.55,
          nodes: Array.from(nodeSet),
          origin: fe.origin,
          route: { method: route.method, path: route.path },
          rationale:
            innerQueries.length > 1
              ? `foreach body issues ${innerQueries.length} read queries; each iteration multiplies the request's SQL cost.`
              : "foreach body issues a read query; each iteration multiplies the request's SQL cost.",
          proposedLift: {
            kind: "batch-loader",
            sketch,
          },
          evidence,
        });
      }
    }

    return out;
  },
};

/**
 * Walk up from a foreach's iterable operand, looking for the effectful read
 * that produced it. We're lenient: the iterable may be wrapped in a member
 * access, cast, or local binding. We only need to find *an* effect.db.query
 * in the iterable's subtree.
 */
function findFeedingQuery(m: Module, iterableId: NodeId): NodeBase | undefined {
  const hits = findDescendants(
    m,
    iterableId,
    (n) =>
      n.dialect === "effect" &&
      n.op === "db.query" &&
      (n.attrs as { kind?: string }).kind === "read",
  );
  return hits[0];
}

// Re-exported for tests that want to inspect helpers directly.
export const __testables = { findFeedingQuery, anyDescendant };
