/**
 * Aggregate TraceOutcomes into per-route correctness scores and an overall
 * CorrectnessReport. Optionally persist to reports/verify/.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { TraceOutcome } from "./replay.js";
import type { Divergence, DivergenceKind } from "./diff.js";

export interface EndpointScore {
  readonly route: string;
  readonly framesTotal: number;
  readonly framesPassed: number;
  readonly correctness: number; // 0..1
  readonly avgBodySimilarity: number; // 0..1
  readonly divergences: ReadonlyArray<{
    readonly traceId: string;
    readonly kinds: ReadonlyArray<Divergence["kind"]>;
    readonly details: ReadonlyArray<string>;
    readonly attributedNodeIds?: ReadonlyArray<string>;
  }>;
}

export interface CorrectnessReport {
  readonly generatedAt: string;
  readonly aggregate: {
    readonly framesTotal: number;
    readonly framesPassed: number;
    readonly correctness: number;
  };
  readonly endpoints: ReadonlyArray<EndpointScore>;
}

export function buildReport(outcomes: ReadonlyArray<TraceOutcome>): CorrectnessReport {
  const byRoute = new Map<string, TraceOutcome[]>();
  for (const o of outcomes) {
    let arr = byRoute.get(o.route);
    if (!arr) {
      arr = [];
      byRoute.set(o.route, arr);
    }
    arr.push(o);
  }

  const endpoints: EndpointScore[] = [];
  let framesTotal = 0;
  let framesPassed = 0;

  for (const [route, traces] of [...byRoute.entries()].sort()) {
    const passed = traces.filter((t) => t.ok).length;
    const avg =
      traces.reduce((s, t) => s + t.diff.bodySimilarity, 0) / Math.max(traces.length, 1);
    const divs = traces
      .filter((t) => !t.ok)
      .map((t) => ({
        traceId: t.traceId,
        kinds: t.diff.divergences.map((d) => d.kind),
        details: t.diff.divergences.map((d) => d.detail),
        ...(t.attributedNodeIds && t.attributedNodeIds.length > 0
          ? { attributedNodeIds: t.attributedNodeIds }
          : {}),
      }));
    endpoints.push({
      route,
      framesTotal: traces.length,
      framesPassed: passed,
      correctness: traces.length === 0 ? 1 : passed / traces.length,
      avgBodySimilarity: avg,
      divergences: divs,
    });
    framesTotal += traces.length;
    framesPassed += passed;
  }

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

export interface DivergenceHistogramEntry {
  readonly kind: DivergenceKind;
  readonly count: number;
}

/**
 * Counts divergence kinds across failed traces (one increment per kind per
 * failed trace row in {@link CorrectnessReport.endpoints} `divergences`).
 */
export function divergenceKindHistogram(report: CorrectnessReport): DivergenceHistogramEntry[] {
  const counts = new Map<DivergenceKind, number>();
  for (const e of report.endpoints) {
    for (const d of e.divergences) {
      for (const k of d.kinds) {
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => ({ kind, count }));
}

/** Number of failed traces (sum of per-endpoint `divergences.length`). */
export function failedTraceCount(report: CorrectnessReport): number {
  let n = 0;
  for (const e of report.endpoints) n += e.divergences.length;
  return n;
}

/**
 * Persist the report as JSON (`<outDir>/summary.json`) plus one file per
 * route (`<outDir>/<route-slug>.json`) so reviewers can drill in quickly.
 */
export function writeReport(
  outDir: string,
  report: CorrectnessReport,
  outcomes: ReadonlyArray<TraceOutcome>,
): string[] {
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  const summaryPath = join(outDir, "summary.json");
  writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  written.push(summaryPath);

  const byRoute = new Map<string, TraceOutcome[]>();
  for (const o of outcomes) {
    let arr = byRoute.get(o.route);
    if (!arr) {
      arr = [];
      byRoute.set(o.route, arr);
    }
    arr.push(o);
  }
  for (const [route, traces] of byRoute) {
    const slug = route.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const p = join(outDir, `${slug}.json`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(
      p,
      JSON.stringify(
        traces.map((t) => ({
          traceId: t.traceId,
          ok: t.ok,
          bodySimilarity: t.diff.bodySimilarity,
          appliedTags: t.diff.appliedTags,
          expected: { status: t.expected.status, headers: t.expected.headers },
          actual: { status: t.actual.status, headers: t.actual.headers },
          divergences: t.diff.divergences,
          ...(t.attributedNodeIds && t.attributedNodeIds.length > 0
            ? { attributedNodeIds: t.attributedNodeIds }
            : {}),
        })),
        null,
        2,
      ),
    );
    written.push(p);
  }
  return written;
}
