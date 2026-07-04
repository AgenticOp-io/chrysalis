import { describe, expect, test } from "vitest";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("hub llm-assisted convert (Phase 42)", () => {
  test("G8800 program entry gate accepts closed program", async () => {
    const { runLlmAssistedConvertProgramEntryGate, isLlmAssistedConvertProgramClosed } =
      await import("../../../scripts/hub-ingest/hub-llm-assisted-convert-program-entry-smoke.mjs");
    expect(isLlmAssistedConvertProgramClosed()).toBe(true);
    const gate = await runLlmAssistedConvertProgramEntryGate();
    expect(gate.ok).toBe(true);
    expect(gate.program?.closed).toBe(true);
  });

  test("G8811 IS routing resolves php→hono with skipLlm", async () => {
    const { runLlmConvertIsRoutingGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-is-routing-smoke.mjs"
    );
    const { domainIdForHubPair } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-is-routing.mjs"
    );
    expect(domainIdForHubPair("php", "hono")).toBe("tinyBlog");
    const gate = await runLlmConvertIsRoutingGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.routing?.skipLlm).toBe(true);
    expect(gate.routing?.proposeOnly).toBe(true);
  });

  test("capability matrix v39 includes llmAssistedConvert and llmConvertFull", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      "../../../scripts/hub-ingest/hub-capability-matrix.mjs"
    );
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(39);
    const report = buildHubCapabilityMatrixReport();
    expect(report.llmAssistedConvert?.entryGate).toBe("G8800");
    expect(report.llmAssistedConvert?.status).toBe("closed");
    expect(report.llmConvertFull?.closeGate).toBe("G8940");
    expect(report.llmConvertFull?.status).toBe("closed");
    expect(report.fullMatrixOracle?.programComplete).toBe(true);
  });

  test("G8812 hole proposals never auto-apply", async () => {
    const { runLlmConvertHoleProposalsGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-hole-proposals-smoke.mjs"
    );
    const gate = await runLlmConvertHoleProposalsGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.proposals?.applied).toBe(false);
  });

  test("G8813 hub UI exposes IS routing summary", async () => {
    const { runLlmConvertUiRoutingGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-ui-routing-smoke.mjs"
    );
    const gate = runLlmConvertUiRoutingGate();
    expect(gate.ok).toBe(true);
  });

  test("G8821 MCP convert tools propose without apply", async () => {
    const { runLlmConvertMcpGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-mcp-smoke.mjs"
    );
    const gate = await runLlmConvertMcpGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
  });

  test("G8830 program close composite is green", async () => {
    const { runLlmAssistedConvertCloseGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-assisted-convert-close-smoke.mjs"
    );
    const gate = await runLlmAssistedConvertCloseGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.closeReady).toBe(true);
    expect(gate.programClosed).toBe(true);
    expect(gate.buildSlice?.ok).toBe(true);
    expect(gate.isRuntime?.ok).toBe(true);
    expect(gate.matrixOracle?.programComplete).toBe(true);
  });

  test("G8911 LLM convert enrich gate is green", async () => {
    const { runLlmConvertEnrichGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-enrich-smoke.mjs"
    );
    const gate = await runLlmConvertEnrichGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
  });

  test("G8912 verify-gated apply records operator confirm", async () => {
    const { runLlmConvertVerifyApplyGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-verify-apply-smoke.mjs"
    );
    const gate = await runLlmConvertVerifyApplyGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.apply?.applied).toBe(true);
    expect(gate.checks?.repairBridgeRecorded).toBe(true);
  });

  test("G8913 repair bridge skips scaffold patches", async () => {
    const { runLlmConvertRepairBridgeGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-repair-bridge-smoke.mjs"
    );
    const gate = await runLlmConvertRepairBridgeGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
  });

  test("G8900 Phase 43 program entry gate accepts closed program", async () => {
    const { runLlmConvertFullProgramDocGate, isLlmConvertFullProgramClosed } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-full-program-entry-smoke.mjs"
    );
    expect(isLlmConvertFullProgramClosed()).toBe(true);
    const gate = runLlmConvertFullProgramDocGate();
    expect(gate.ok).toBe(true);
    expect(gate.closed).toBe(true);
  });

  test("G8940 Phase 43 program close composite is green", async () => {
    const { runLlmConvertFullCloseGate } = await import(
      "../../../scripts/hub-ingest/hub-llm-convert-full-close-smoke.mjs"
    );
    const gate = await runLlmConvertFullCloseGate({ repoRoot: ROOT });
    expect(gate.ok).toBe(true);
    expect(gate.closeReady).toBe(true);
    expect(gate.programClosed).toBe(true);
    expect(gate.buildSlice?.ok).toBe(true);
    expect(gate.repairBridge?.ok).toBe(true);
  });
});
