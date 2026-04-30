import { describe, expect, it } from "vitest";
import { buildMergedVerifySummaryJson, mergeCorrectnessReports } from "../src/merge-partition.js";
import type { CorrectnessReport } from "../src/report.js";

function miniReport(framesTotal: number, framesPassed: number, route = "GET /x"): CorrectnessReport {
  const failed = framesTotal - framesPassed;
  const divergences =
    failed > 0
      ? Array.from({ length: failed }, (_, i) => ({
          traceId: `f-${i}`,
          kinds: ["body-mismatch" as const],
          details: ["x"],
        }))
      : [];
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    aggregate: { framesTotal, framesPassed, correctness: framesTotal === 0 ? 1 : framesPassed / framesTotal },
    endpoints: [
      {
        route,
        framesTotal,
        framesPassed,
        correctness: framesTotal === 0 ? 1 : framesPassed / framesTotal,
        avgBodySimilarity: 0.9,
        divergences,
      },
    ],
  };
}

describe("mergeCorrectnessReports", () => {
  it("merges disjoint shards into combined aggregate", () => {
    const a = miniReport(3, 3);
    const b = miniReport(2, 1);
    const m = mergeCorrectnessReports([a, b]);
    expect(m.aggregate.framesTotal).toBe(5);
    expect(m.aggregate.framesPassed).toBe(4);
    expect(m.aggregate.correctness).toBe(4 / 5);
  });

  it("merges same route across shards", () => {
    const a = miniReport(2, 2, "GET /a");
    const b = miniReport(3, 2, "GET /a");
    const m = mergeCorrectnessReports([a, b]);
    expect(m.endpoints).toHaveLength(1);
    expect(m.endpoints[0]!.route).toBe("GET /a");
    expect(m.endpoints[0]!.framesTotal).toBe(5);
    expect(m.endpoints[0]!.framesPassed).toBe(4);
    expect(m.endpoints[0]!.divergences).toHaveLength(1);
  });

  it("returns empty merge for zero inputs", () => {
    const m = mergeCorrectnessReports([]);
    expect(m.aggregate.framesTotal).toBe(0);
    expect(m.endpoints).toHaveLength(0);
  });
});

describe("buildMergedVerifySummaryJson", () => {
  it("wraps merged report with contract metadata", () => {
    const j = buildMergedVerifySummaryJson({
      toolVersion: "9.9.9",
      shardCount: 2,
      inputs: [
        { path: "/a/summary.json", shardIndex: 0, report: miniReport(1, 1) },
        { path: "/b/summary.json", shardIndex: 1, report: miniReport(1, 0) },
      ],
    });
    expect(j.kind).toBe("chrysalis.verify.summary.merged");
    expect(j.schemaVersion).toBe(1);
    expect(j.toolVersion).toBe("9.9.9");
    expect(j.shardCount).toBe(2);
    expect(j.inputs).toHaveLength(2);
    expect(j.merged.aggregate.framesTotal).toBe(2);
  });
});
