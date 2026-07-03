import { describe, expect, test } from "vitest";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("hub llm-assisted convert (Phase 42)", () => {
  test("G8800 program entry gate is green", async () => {
    const { runLlmAssistedConvertProgramEntryGate, isLlmAssistedConvertProgramActive } =
      await import("../../../scripts/hub-ingest/hub-llm-assisted-convert-program-entry-smoke.mjs");
    expect(isLlmAssistedConvertProgramActive()).toBe(true);
    const gate = await runLlmAssistedConvertProgramEntryGate();
    expect(gate.ok).toBe(true);
    expect(gate.program?.active).toBe(true);
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
});
