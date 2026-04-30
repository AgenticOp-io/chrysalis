/**
 * Merge per-shard {@link CorrectnessReport} values into one report (V2-M1).
 * Callers must ensure shards form a partition (disjoint trace sets); overlap
 * duplicates divergences and inflates frame counts.
 */

import type { DivergenceKind } from "./diff.js";
import type { CorrectnessReport, EndpointScore } from "./report.js";

export interface MergedVerifySummaryJson {
  readonly kind: "chrysalis.verify.summary.merged";
  readonly schemaVersion: 1;
  readonly toolVersion: string;
  readonly shardCount: number;
  readonly inputs: ReadonlyArray<{
    readonly path: string;
    readonly shardIndex: number;
    readonly aggregate: CorrectnessReport["aggregate"];
  }>;
  readonly merged: CorrectnessReport;
}

/**
 * Merge disjoint shard reports into a single {@link CorrectnessReport}.
 * Endpoint rows with the same `route` are combined (frames summed, body
 * similarity weighted by frame count, divergences concatenated).
 */
export function mergeCorrectnessReports(reports: ReadonlyArray<CorrectnessReport>): CorrectnessReport {
  if (reports.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      aggregate: { framesTotal: 0, framesPassed: 0, correctness: 1 },
      endpoints: [],
    };
  }

  let framesTotal = 0;
  let framesPassed = 0;
  for (const r of reports) {
    framesTotal += r.aggregate.framesTotal;
    framesPassed += r.aggregate.framesPassed;
  }

  type DivRow = {
    traceId: string;
    kinds: DivergenceKind[];
    details: string[];
    attributedNodeIds?: string[];
  };
  type Acc = {
    framesTotal: number;
    framesPassed: number;
    simWeighted: number;
    divergences: DivRow[];
  };
  const byRoute = new Map<string, Acc>();
  for (const r of reports) {
    for (const e of r.endpoints) {
      const cur = byRoute.get(e.route);
      const divs: DivRow[] = e.divergences.map((d) => ({
        traceId: d.traceId,
        kinds: [...d.kinds],
        details: [...d.details],
        ...(d.attributedNodeIds && d.attributedNodeIds.length > 0
          ? { attributedNodeIds: [...d.attributedNodeIds] }
          : {}),
      }));
      if (!cur) {
        byRoute.set(e.route, {
          framesTotal: e.framesTotal,
          framesPassed: e.framesPassed,
          simWeighted: e.avgBodySimilarity * e.framesTotal,
          divergences: divs,
        });
      } else {
        cur.framesTotal += e.framesTotal;
        cur.framesPassed += e.framesPassed;
        cur.simWeighted += e.avgBodySimilarity * e.framesTotal;
        cur.divergences.push(...divs);
      }
    }
  }

  const endpoints: EndpointScore[] = [...byRoute.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, v]) => ({
      route,
      framesTotal: v.framesTotal,
      framesPassed: v.framesPassed,
      correctness: v.framesTotal === 0 ? 1 : v.framesPassed / v.framesTotal,
      avgBodySimilarity: v.framesTotal === 0 ? 1 : v.simWeighted / v.framesTotal,
      divergences: v.divergences.map((d) => ({
        traceId: d.traceId,
        kinds: d.kinds,
        details: d.details,
        ...(d.attributedNodeIds && d.attributedNodeIds.length > 0
          ? { attributedNodeIds: d.attributedNodeIds }
          : {}),
      })),
    }));

  return {
    generatedAt: new Date().toISOString(),
    aggregate: {
      framesTotal,
      framesPassed,
      correctness: framesTotal === 0 ? 1 : framesPassed / framesTotal,
    },
    endpoints,
  };
}

export function buildMergedVerifySummaryJson(input: {
  readonly toolVersion: string;
  readonly shardCount: number;
  readonly inputs: ReadonlyArray<{ readonly path: string; readonly shardIndex: number; readonly report: CorrectnessReport }>;
}): MergedVerifySummaryJson {
  const merged = mergeCorrectnessReports(input.inputs.map((i) => i.report));
  return {
    kind: "chrysalis.verify.summary.merged",
    schemaVersion: 1,
    toolVersion: input.toolVersion,
    shardCount: input.shardCount,
    inputs: input.inputs.map((i) => ({
      path: i.path,
      shardIndex: i.shardIndex,
      aggregate: i.report.aggregate,
    })),
    merged,
  };
}
