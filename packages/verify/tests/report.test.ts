import type { HttpResponseEvent } from "@chrysalis/oracle";
import { describe, expect, it } from "vitest";
import { buildReport, divergenceKindHistogram, failedTraceCount } from "../src/report.js";
import type { TraceOutcome } from "../src/replay.js";

const baseExpected: HttpResponseEvent = {
  type: "http.response",
  status: 200,
  headers: {},
  body: "",
  bodyTruncated: false,
  session: {},
};

function fakeOutcome(
  route: string,
  traceId: string,
  ok: boolean,
  kinds: Array<"status-mismatch" | "header-mismatch" | "body-mismatch">,
): TraceOutcome {
  return {
    route,
    traceId,
    ok,
    diff: {
      divergences: kinds.map((kind) => ({
        kind,
        detail: `${kind} detail`,
        expected: "",
        actual: "",
      })),
      bodySimilarity: ok ? 1 : 0.1,
      appliedTags: [],
    },
    expected: baseExpected,
    actual: { status: 200, headers: {}, body: "" },
  };
}

describe("report helpers", () => {
  it("divergenceKindHistogram aggregates kinds across failed traces", () => {
    const outcomes: TraceOutcome[] = [
      fakeOutcome("GET /a", "t1", false, ["body-mismatch"]),
      fakeOutcome("GET /a", "t2", false, ["body-mismatch", "header-mismatch"]),
      fakeOutcome("GET /b", "t3", true, []),
    ];
    const report = buildReport(outcomes);
    const hist = divergenceKindHistogram(report);
    expect(hist).toEqual([
      { kind: "body-mismatch", count: 2 },
      { kind: "header-mismatch", count: 1 },
    ]);
    expect(failedTraceCount(report)).toBe(2);
  });

  it("failedTraceCount is zero when all traces pass", () => {
    const report = buildReport([fakeOutcome("GET /x", "t1", true, [])]);
    expect(divergenceKindHistogram(report)).toEqual([]);
    expect(failedTraceCount(report)).toBe(0);
  });
});
