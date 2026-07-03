#!/usr/bin/env node
/** Phase 43 build slice — G8911–G8922 composite. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmConvertFullProgramDocGate } from "./hub-llm-convert-full-program-entry-smoke.mjs";
import { runLlmConvertEnrichGate } from "./hub-llm-convert-enrich-smoke.mjs";
import { runLlmConvertVerifyApplyGate } from "./hub-llm-convert-verify-apply-smoke.mjs";
import { runLlmAssistedConvertCloseGate } from "./hub-llm-assisted-convert-close-smoke.mjs";

export const LLM_CONVERT_FULL_BUILD_SLICE_KIND = "chrysalis.llm-convert-full-build-slice-smoke";
export const LLM_CONVERT_FULL_BUILD_SLICE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runLlmConvertFullBuildSliceGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runLlmConvertFullProgramDocGate();
  const enrich = await runLlmConvertEnrichGate({ repoRoot });
  const verifyApply = await runLlmConvertVerifyApplyGate({ repoRoot });
  const phase42 = await runLlmAssistedConvertCloseGate({ repoRoot });
  const ok = program.ok && enrich.ok && verifyApply.ok && phase42.ok;
  return {
    kind: LLM_CONVERT_FULL_BUILD_SLICE_KIND,
    schemaVersion: LLM_CONVERT_FULL_BUILD_SLICE_SCHEMA_VERSION,
    ok,
    program,
    enrich,
    verifyApply,
    phase42Regression: phase42,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertFullBuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-full-build-slice");
  const t0 = progress.start("LLM convert full build slice (G8910–G8922)");
  const gate = await runLlmConvertFullBuildSliceGate(opts);
  progress.end("LLM convert full build slice (G8910–G8922)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runLlmConvertFullBuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-full-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
