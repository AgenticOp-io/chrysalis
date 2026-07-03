#!/usr/bin/env node
/** Phase 42 build slice — G8811–G8822 composite. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmConvertIsRoutingGate } from "./hub-llm-convert-is-routing-smoke.mjs";
import { runLlmConvertHoleProposalsGate } from "./hub-llm-convert-hole-proposals-smoke.mjs";
import { runLlmConvertUiRoutingGate } from "./hub-llm-convert-ui-routing-smoke.mjs";
import { runLlmConvertMcpGate } from "./hub-llm-convert-mcp-smoke.mjs";
import { runLlmConvertPocGate } from "./hub-llm-convert-poc-smoke.mjs";
import { runLlmAssistedConvertProgramDocGate } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";

export const LLM_CONVERT_BUILD_SLICE_SMOKE_KIND = "chrysalis.llm-convert-build-slice-smoke";
export const LLM_CONVERT_BUILD_SLICE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runLlmConvertBuildSliceGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmAssistedConvertProgramDocGate();
  const isRouting = await runLlmConvertIsRoutingGate({ repoRoot });
  const holeProposals = await runLlmConvertHoleProposalsGate({ repoRoot });
  const uiRouting = runLlmConvertUiRoutingGate();
  const mcp = await runLlmConvertMcpGate({ repoRoot });
  const poc = await runLlmConvertPocGate({ repoRoot });
  const ok =
    program.ok === true &&
    isRouting.ok === true &&
    holeProposals.ok === true &&
    uiRouting.ok === true &&
    mcp.ok === true &&
    poc.ok === true;
  return {
    kind: LLM_CONVERT_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok,
    program,
    isRouting,
    holeProposals,
    uiRouting,
    mcp,
    poc,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertBuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-build-slice");
  const t0 = progress.start("LLM convert build slice (G8810–G8822)");
  const gate = await runLlmConvertBuildSliceGate(opts);
  progress.end("LLM convert build slice (G8810–G8822)", gate.ok === true, t0);
  return {
    kind: LLM_CONVERT_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertBuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
