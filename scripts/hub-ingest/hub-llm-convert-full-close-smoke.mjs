#!/usr/bin/env node
/** Phase 43 program close (G8940) — build slice + repair bridge + Phase 42 regression. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runLlmConvertFullBuildSliceGate } from "./hub-llm-convert-full-build-slice-smoke.mjs";
import { runLlmConvertRepairBridgeGate } from "./hub-llm-convert-repair-bridge-smoke.mjs";
import { isLlmConvertFullProgramClosed } from "./hub-llm-convert-full-program-entry-smoke.mjs";

export const LLM_CONVERT_FULL_CLOSE_SMOKE_KIND = "chrysalis.llm-convert-full-close-smoke";
export const LLM_CONVERT_FULL_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/** G8940 — full build slice + repair bridge + Phase 42 regression (in build slice). */
export async function runLlmConvertFullCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const buildSlice = await runLlmConvertFullBuildSliceGate({ repoRoot });
  const repairBridge = await runLlmConvertRepairBridgeGate({ repoRoot });
  const programClosed = isLlmConvertFullProgramClosed();
  const closeReady = buildSlice.ok === true && repairBridge.ok === true;
  const ok = closeReady;
  return {
    kind: LLM_CONVERT_FULL_CLOSE_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_FULL_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    closeReady,
    programClosed,
    buildSlice,
    repairBridge,
    generatedAt: new Date().toISOString(),
  };
}

export async function runLlmConvertFullCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("llm-convert-full-close");
  const t0 = progress.start("LLM convert full close (G8940)");
  const gate = await runLlmConvertFullCloseGate(opts);
  progress.end("LLM convert full close (G8940)", gate.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: resolve(opts.repoRoot ?? scriptRoot),
    gateName: "G8940",
    ok: gate.ok === true,
    detail: {
      buildSlice: gate.buildSlice?.ok ?? false,
      repairBridge: gate.repairBridge?.ok ?? false,
      programClosed: gate.programClosed === true,
    },
  });
  return {
    kind: LLM_CONVERT_FULL_CLOSE_SMOKE_KIND,
    schemaVersion: LLM_CONVERT_FULL_CLOSE_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
  };
}

async function main() {
  const r = await runLlmConvertFullCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-llm-convert-full-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
