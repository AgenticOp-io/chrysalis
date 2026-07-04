#!/usr/bin/env node
/** Phase 43 closed regression for active downstream build slices (G8940 maintenance). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import {
  runLlmConvertFullProgramDocGate,
  isLlmConvertFullProgramClosed,
} from "./hub-llm-convert-full-program-entry-smoke.mjs";
import { runLlmConvertEnrichGate } from "./hub-llm-convert-enrich-smoke.mjs";
import { runLlmConvertRepairBridgeGate } from "./hub-llm-convert-repair-bridge-smoke.mjs";

export const LLM_CONVERT_FULL_CLOSED_REGRESSION_KIND =
  "chrysalis.llm-convert-full-closed-regression-smoke";
export const LLM_CONVERT_FULL_CLOSED_REGRESSION_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Docs + enrich + repair bridge when Phase 43 is closed. */
export async function runLlmConvertFullClosedRegressionGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmConvertFullProgramDocGate();
  const enrich = await runLlmConvertEnrichGate({ repoRoot });
  const repairBridge = await runLlmConvertRepairBridgeGate({ repoRoot });
  const ok =
    isLlmConvertFullProgramClosed() &&
    program.ok === true &&
    enrich.ok === true &&
    repairBridge.ok === true;
  return {
    kind: LLM_CONVERT_FULL_CLOSED_REGRESSION_KIND,
    schemaVersion: LLM_CONVERT_FULL_CLOSED_REGRESSION_SCHEMA_VERSION,
    ok,
    program,
    enrich,
    repairBridge,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertFullClosedRegressionSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-full-closed-regression");
  const t0 = progress.start("LLM convert full closed regression (G8940)");
  const gate = await runLlmConvertFullClosedRegressionGate(opts);
  progress.end("LLM convert full closed regression (G8940)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertFullClosedRegressionSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-full-closed-regression-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
