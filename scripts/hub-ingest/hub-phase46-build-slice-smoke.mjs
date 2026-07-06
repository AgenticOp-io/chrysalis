#!/usr/bin/env node
/** Phase 46 build slice — entry + census + wave6 + runtime depth + Phase 45 close regression (G9280). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46ProgramDocGate } from "./hub-phase46-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWave6Gate } from "./hub-extended-matrix-oracle-wave6-smoke.mjs";
import { runExtendedMatrixOracleWave7Gate } from "./hub-extended-matrix-oracle-wave7-smoke.mjs";
import { runPhase46CwlRuntimeDepthGate } from "./hub-phase46-cwl-runtime-depth-smoke.mjs";
import { runPhase45ProgramCloseGate } from "./hub-phase45-program-close-smoke.mjs";

export const PHASE46_BUILD_SLICE_KIND = "chrysalis.phase46-build-slice-smoke";
export const PHASE46_BUILD_SLICE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runPhase46BuildSliceGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase46ProgramDocGate();
  const census = runExtendedMatrixOracleProgressGate();
  const wave6 = runExtendedMatrixOracleWave6Gate();
  const wave7 = runExtendedMatrixOracleWave7Gate();
  const runtimeDepth = await runPhase46CwlRuntimeDepthGate({ ...opts, repoRoot });
  const phase45Close = await runPhase45ProgramCloseGate({ repoRoot });
  const ok =
    program.ok === true &&
    census.ok === true &&
    wave6.ok === true &&
    runtimeDepth.ok === true &&
    phase45Close.ok === true;
  return {
    kind: PHASE46_BUILD_SLICE_KIND,
    schemaVersion: PHASE46_BUILD_SLICE_SCHEMA_VERSION,
    ok,
    program,
    census,
    wave6,
    wave7,
    runtimeDepth,
    phase45Close,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase46BuildSliceSmoke(opts = {}) {
  const progress = createSmokeProgress("phase46-build-slice");
  const t0 = progress.start("Phase 46 build slice (G9280)");
  const gate = await runPhase46BuildSliceGate(opts);
  progress.end("Phase 46 build slice (G9280)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase46BuildSliceSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase46-build-slice-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
