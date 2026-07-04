import { describe, expect, test } from "vitest";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("hub Phase 44 program (G9000–G9140)", () => {
  test("G9000 program entry gate accepts closed Phase 44", async () => {
    const { runPhase44ProgramDocGate, isPhase44ProgramActive, isPhase44ProgramClosed } = await import(
      "../../../scripts/hub-ingest/hub-phase44-program-entry-smoke.mjs"
    );
    expect(isPhase44ProgramClosed()).toBe(true);
    expect(isPhase44ProgramActive()).toBe(false);
    const gate = runPhase44ProgramDocGate();
    expect(gate.ok).toBe(true);
    expect(gate.closed).toBe(true);
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

  test("G9030 wave-1 track close gate is green", async () => {
    const { runExtendedMatrixOracleWave1CloseGate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-wave1-close-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleWave1CloseGate();
    expect(gate.ok).toBe(true);
    expect(gate.wave1Complete).toBe(true);
  });

  test("G9070 hole-closure verify-apply close gate is green", async () => {
    const { runLlmConvertHoleClosureCloseGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-hole-closure-close-smoke.mjs"
    );
    const gate = await runLlmConvertHoleClosureCloseGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.checks?.closurePatchProposed).toBe(true);
    expect(gate.checks?.repairBridgeInvoked).toBe(true);
  });

  test("G9020 wave-2 smoke gate is green", async () => {
    const { runExtendedMatrixOracleWave2Gate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-wave2-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleWave2Gate();
    expect(gate.ok).toBe(true);
    expect(gate.wave?.oracleInWave).toBeGreaterThanOrEqual(20);
  });

  test("G9040 wave-2 track close gate is green", async () => {
    const { runExtendedMatrixOracleWave2CloseGate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-wave2-close-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleWave2CloseGate();
    expect(gate.ok).toBe(true);
    expect(gate.wave2Complete).toBe(true);
  });

  test("G9130 Horizon C operator train close gate is green", async () => {
    const { runHorizonCTrainCloseGate } = await import(
      "../../../scripts/hub-ingest/hub-horizon-c-train-close-smoke.mjs"
    );
    const gate = await runHorizonCTrainCloseGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.checks?.operatorContractOk).toBe(true);
  });

  test("G9080 wave-3 smoke gate is green", async () => {
    const { runExtendedMatrixOracleWave3Gate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-wave3-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleWave3Gate();
    expect(gate.ok).toBe(true);
    expect(gate.wave?.oracleInWave).toBeGreaterThanOrEqual(12);
  });

  test("G9085 wave-3 track close gate is green", async () => {
    const { runExtendedMatrixOracleWave3CloseGate } = await import(
      "../../../scripts/hub-ingest/hub-extended-matrix-oracle-wave3-close-smoke.mjs"
    );
    const gate = runExtendedMatrixOracleWave3CloseGate();
    expect(gate.ok).toBe(true);
    expect(gate.wave3Complete).toBe(true);
  });

  test("G9121 operator hub UI smoke is green", async () => {
    const { runPhase44UiGate } = await import("../../../scripts/hub-ingest/hub-phase44-ui-smoke.mjs");
    const gate = runPhase44UiGate();
    expect(gate.ok).toBe(true);
    expect(gate.checks?.extendedMatrixCard).toBe(true);
    expect(gate.checks?.uiHoleClosureJobText).toBe(true);
  });

  test("capability matrix v43 includes wave3 and operator UI", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      "../../../scripts/hub-ingest/hub-capability-matrix.mjs"
    );
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(43);
    const report = buildHubCapabilityMatrixReport();
    expect(report.phase44?.trackCloseGates?.wave3).toBe("G9085");
    expect(report.phase44?.operatorUiGate).toBe("G9121");
    expect(report.phase44?.status).toBe("closed");
    expect(report.extendedMatrixOracle?.wave3Complete).toBe(true);
    expect(report.horizonCTrain?.closeGate).toBe("G9130");
    expect(report.fullMatrixOracle?.corePairCount).toBe(72);
  });

  test("G9140 program close composite is green and honest", async () => {
    const { runPhase44ProgramCloseGate } = await import(
      "../../../scripts/hub-ingest/hub-phase44-program-close-smoke.mjs"
    );
    const gate = await runPhase44ProgramCloseGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.closeReady).toBe(true);
    expect(gate.programHonest).toBe(true);
    expect(gate.programClosed).toBe(true);
    expect(gate.census?.belowTarget).toBeGreaterThan(0);
  });

  test("capability matrix v42 includes wave2 and horizonCTrain", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      "../../../scripts/hub-ingest/hub-capability-matrix.mjs"
    );
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(42);
    const report = buildHubCapabilityMatrixReport();
    expect(report.phase44?.trackCloseGates?.wave2).toBe("G9040");
    expect(report.extendedMatrixOracle?.wave2Complete).toBe(true);
    expect(report.horizonCTrain?.closeGate).toBe("G9130");
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
    expect(gate.wave1Close?.ok).toBe(true);
    expect(gate.wave2Close?.ok).toBe(true);
    expect(gate.holeClosureClose?.ok).toBe(true);
    expect(gate.wave3Close?.ok).toBe(true);
    expect(gate.operatorUi?.ok).toBe(true);
    expect(gate.phase43Regression?.ok).toBe(true);
  });
});
