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

  test("capability matrix v38 includes llmAssistedConvert", async () => {
    const { buildHubCapabilityMatrixReport, HUB_CAPABILITY_MATRIX_SCHEMA_VERSION } = await import(
      "../../../scripts/hub-ingest/hub-capability-matrix.mjs"
    );
    expect(HUB_CAPABILITY_MATRIX_SCHEMA_VERSION).toBeGreaterThanOrEqual(38);
    const report = buildHubCapabilityMatrixReport();
    expect(report.llmAssistedConvert?.entryGate).toBe("G8800");
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
});
