#!/usr/bin/env node
/** Phase 41 master build slice — composes 41a–41e + matrix progress (G8700 program). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase41LlmBuildSliceGate } from "./hub-phase41-llm-build-slice-smoke.mjs";
import { runPhase41bPythonBuildSliceGate } from "./hub-phase41b-python-build-slice-smoke.mjs";
import { runPhase41cNativeBuildSliceGate } from "./hub-phase41c-native-build-slice-smoke.mjs";
import { runPhase41dNativeEmitGate } from "./hub-phase41d-native-emit-smoke.mjs";
import { runPhase41eCwlEffectsGate } from "./hub-phase41e-cwl-effects-smoke.mjs";
import { runFullMatrixOracleProgramDocGate } from "./hub-full-matrix-oracle-program-entry-smoke.mjs";

export const PHASE41_MASTER_BUILD_SLICE_SMOKE_KIND = "chrysalis.phase41-master-build-slice-smoke";
export const PHASE41_MASTER_BUILD_SLICE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase41MasterBuildSliceGate(opts = {}) {
  const entry = runFullMatrixOracleProgramDocGate();
  const slice41a = await runPhase41LlmBuildSliceGate(opts);
  const slice41b = await runPhase41bPythonBuildSliceGate(opts);
  const slice41c = await runPhase41cNativeBuildSliceGate();
  const slice41d = await runPhase41dNativeEmitGate();
  const slice41e = await runPhase41eCwlEffectsGate();

  const ok =
    entry.ok === true &&
    slice41a.ok === true &&
    slice41b.ok === true &&
    slice41c.ok === true &&
    slice41d.ok === true &&
    slice41e.ok === true;

  return {
    kind: PHASE41_MASTER_BUILD_SLICE_SMOKE_KIND,
    schemaVersion: PHASE41_MASTER_BUILD_SLICE_SMOKE_SCHEMA_VERSION,
    ok,
    entry: { ok: entry.ok === true, gate: "G8700", ...entry },
    slice41a: { ok: slice41a.ok === true, gate: "G8710", ...slice41a },
    slice41b: { ok: slice41b.ok === true, gate: "G8720", ...slice41b },
    slice41c: { ok: slice41c.ok === true, gate: "G8730", ...slice41c },
    slice41d: { ok: slice41d.ok === true, gate: "G8740", ...slice41d },
    slice41e: { ok: slice41e.ok === true, gate: "G8750", ...slice41e },
    programComplete: false,
    note: "Matrix oracle program close (G8790) requires all 72 pairs at oracle-product tier",
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase41MasterBuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("phase41-master-build-slice");
  const t0 = progress.start("Phase 41 master build slice");
  const gate = await runPhase41MasterBuildSliceGate(opts);
  progress.end("Phase 41 master build slice", gate.ok === true, t0);
  return { kind: PHASE41_MASTER_BUILD_SLICE_SMOKE_KIND, schemaVersion: PHASE41_MASTER_BUILD_SLICE_SMOKE_SCHEMA_VERSION, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase41MasterBuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase41-master-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
