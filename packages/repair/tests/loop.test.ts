import { describe, expect, it, vi } from "vitest";
import { NO_EFFECTS, nodeId, synthetic, type Module } from "@chrysalis/webir";
import type { TraceCorpus } from "@chrysalis/oracle";
import type { TraceOutcome } from "@chrysalis/verify";
import { runVerifiedRepairLoop, stubRepairProposer } from "../src/index.js";

const emptyCorpus: TraceCorpus = {
  schemaVersion: "1.0.0",
  traces: [],
};

const trivialModule = {
  nodes: new Map(),
  roots: [],
  meta: { sourceApp: "test" },
} as unknown as Module;

const sampleExpected: TraceOutcome["expected"] = {
  type: "http.response",
  status: 200,
  headers: {},
  body: "",
  bodyTruncated: false,
  session: {},
};

describe("runVerifiedRepairLoop", () => {
  it("returns ok when replay passes on first call", async () => {
    const replay = vi.fn().mockResolvedValueOnce([] as TraceOutcome[]);
    const r = await runVerifiedRepairLoop({
      corpus: emptyCorpus,
      initialModule: trivialModule,
      replayBase: { baseUrl: "http://test" },
      proposer: stubRepairProposer(),
      maxIterations: 3,
      replayCorpusImpl: replay,
    });
    expect(r.ok).toBe(true);
    expect(r.iterationsRun).toBe(0);
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("abstains when proposer returns no edits", async () => {
    const badOutcome: TraceOutcome = {
      traceId: "t1",
      route: "GET /x",
      expected: sampleExpected,
      actual: { status: 404, headers: {}, body: "" },
      diff: { divergences: [], bodySimilarity: 0, appliedTags: [] },
      ok: false,
    };
    const replay = vi.fn().mockResolvedValue([badOutcome]);
    const r = await runVerifiedRepairLoop({
      corpus: emptyCorpus,
      initialModule: trivialModule,
      replayBase: { baseUrl: "http://test" },
      proposer: stubRepairProposer(),
      maxIterations: 3,
      replayCorpusImpl: replay,
    });
    expect(r.ok).toBe(false);
    expect(r.proposerAbstained).toBe(true);
    expect(r.iterationsRun).toBe(1);
    expect(replay).toHaveBeenCalledTimes(2);
  });

  it("accepts patched module when replay turns green", async () => {
    const badOutcome: TraceOutcome = {
      traceId: "t1",
      route: "GET /x",
      expected: sampleExpected,
      actual: { status: 500, headers: {}, body: "" },
      diff: {
        divergences: [
          {
            kind: "status-mismatch",
            detail: "x",
            expected: "200",
            actual: "500",
          },
        ],
        bodySimilarity: 0,
        appliedTags: [],
      },
      ok: false,
    };
    const replay = vi
      .fn()
      .mockResolvedValueOnce([badOutcome])
      .mockResolvedValueOnce([] as TraceOutcome[]);
    const origin = synthetic("repair-test");
    const newNode = {
      id: nodeId("repair-leaf"),
      dialect: "data",
      op: "literal",
      type: { kind: "primitive", name: "string" } as const,
      effects: NO_EFFECTS,
      operands: [] as const,
      attrs: { value: "patch-marker" },
      origin,
      provenance: [] as const,
    };
    const r = await runVerifiedRepairLoop({
      corpus: emptyCorpus,
      initialModule: trivialModule,
      replayBase: { baseUrl: "http://test" },
      proposer: {
        propose: async () => [{ kind: "add" as const, node: newNode }],
      },
      maxIterations: 3,
      replayCorpusImpl: replay,
    });
    expect(r.ok).toBe(true);
    expect(r.module.nodes.get(nodeId("repair-leaf"))).toBeDefined();
    expect(replay).toHaveBeenCalledTimes(2);
  });
});
