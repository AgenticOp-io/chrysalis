import { describe, expect, test } from "vitest";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("hub Phase 44 program (G9000–G9110)", () => {
  test("G9000 program entry gate accepts active Phase 44", async () => {
    const { runPhase44ProgramDocGate, isPhase44ProgramActive } = await import(
      "../../../scripts/hub-ingest/hub-phase44-program-entry-smoke.mjs"
    );
    expect(isPhase44ProgramActive()).toBe(true);
    const gate = runPhase44ProgramDocGate();
    expect(gate.ok).toBe(true);
    expect(gate.active).toBe(true);
  });

  test("G9001 extended matrix census reports wave progress", async () => {
    const { runExtendedMatrixOracleProgressGate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-progress-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleProgressGate();
    expect(gate.ok).toBe(true);
    expect(gate.oracleProductCount).toBeGreaterThanOrEqual(72);
    expect(gate.totalPairs).toBe(601);
    expect(gate.coreOracle).toBe(72);
  });

  test("G9010 wave-1 smoke gate is green", async () => {
    const { runExtendedMatrixOracleWave1Gate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-wave1-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleWave1Gate();
    expect(gate.ok).toBe(true);
  });

  test("G9051 hole-closure hint + repair bridge smoke", async () => {
    const { runLlmConvertHoleClosureGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-hole-closure-smoke.mjs"
    );
    const gate = await runLlmConvertHoleClosureGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.checks?.enrichHoleClosure).toBe(true);
    expect(gate.checks?.repairBridgeOk).toBe(true);
  });

  test("G9110 Horizon C train loop dry-run smoke", async () => {
    const { runHorizonCTrainLoopGate } = await import(
      "../../../scripts/hub-ingest/hub-horizon-c-train-loop-smoke.mjs"
    );
    const gate = await runHorizonCTrainLoopGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
  });

  test("capability matrix v40 includes phase44 active entry", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      "../../../scripts/hub-ingest/hub-capability-matrix.mjs"
    );
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(40);
    const report = buildHubCapabilityMatrixReport();
    expect(report.phase44?.entryGate).toBe("G9000");
    expect(report.phase44?.status).toBe("active");
    expect(report.phase44?.closeGate).toBe("G9140");
    expect(report.fullMatrixOracle?.corePairCount).toBe(72);
  });

  test("G8940 Phase 43 closed regression passes under Phase 44", async () => {
    const { runLlmConvertFullClosedRegressionGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-full-closed-regression-smoke.mjs"
    );
    const gate = await runLlmConvertFullClosedRegressionGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.program?.closed).toBe(true);
  });

  test("G9000 Phase 44 build slice composite is green", async () => {
    const { runPhase44BuildSliceGate } = await import(
      "../../../scripts/hub-ingest/hub-phase44-build-slice-smoke.mjs"
    );
    const gate = await runPhase44BuildSliceGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.phase41Regression?.programComplete).toBe(true);
    expect(gate.phase43Regression?.ok).toBe(true);
  });
});
