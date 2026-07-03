#!/usr/bin/env node
/** Phase 42 program close (G8830) — G8810 + G8820 + G8790 + G8600 regression. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmConvertBuildSliceGate } from "./hub-llm-convert-build-slice-smoke.mjs";
import { runIsRuntimeCloseSmoke } from "./hub-is-runtime-close-smoke.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { isLlmAssistedConvertProgramClosed } from "./hub-llm-assisted-convert-program-entry-smoke.mjs";

export const LLM_ASSISTED_CONVERT_CLOSE_SMOKE_KIND = "chrysalis.llm-assisted-convert-close-smoke";
export const LLM_ASSISTED_CONVERT_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** G8830 — convert build slice + IS runtime + full matrix oracle regression. */
export async function runLlmAssistedConvertCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const buildSlice = await runLlmConvertBuildSliceGate({ repoRoot });
  const isRuntime = await runIsRuntimeCloseSmoke({ repoRoot });
  const matrixOracle = runFullMatrixOracleProgressGate();
  const programClosed = isLlmAssistedConvertProgramClosed();
  const closeReady =
    buildSlice.ok === true &&
    isRuntime.ok === true &&
    matrixOracle.ok === true &&
    matrixOracle.programComplete === true;
  const ok = closeReady;
  return {
    kind: LLM_ASSISTED_CONVERT_CLOSE_SMOKE_KIND,
    schemaVersion: LLM_ASSISTED_CONVERT_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    closeReady,
    programClosed,
    buildSlice,
    isRuntime,
    matrixOracle,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmAssistedConvertCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-assisted-convert-close");
  const t0 = progress.start("LLM-assisted convert close (G8830)");
  const gate = await runLlmAssistedConvertCloseGate(opts);
  progress.end("LLM-assisted convert close (G8830)", gate.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G8830",
    ok: gate.ok === true,
    detail: {
      buildSlice: gate.buildSlice?.ok ?? false,
      isRuntime: gate.isRuntime?.ok ?? false,
      matrixOracle: gate.matrixOracle?.ok ?? false,
      programClosed: gate.programClosed === true,
    },
  });
  return {
    kind: LLM_ASSISTED_CONVERT_CLOSE_SMOKE_KIND,
    schemaVersion: LLM_ASSISTED_CONVERT_CLOSE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmAssistedConvertCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-assisted-convert-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
