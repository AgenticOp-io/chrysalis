#!/usr/bin/env node
/** Phase 46 program close (G9290) — honest composite; not 601/601 oracle-product. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46BuildSliceGate } from "./hub-phase46-build-slice-smoke.mjs";
import { runExtendedMatrixOracleWave7CloseGate } from "./hub-extended-matrix-oracle-wave7-close-smoke.mjs";
import { runExtendedMatrixOracleProgressGate, isExtendedMatrixCensusProgramHonest } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runPhase46CwlRuntimeDepthCloseGate } from "./hub-phase46-cwl-runtime-depth-close-smoke.mjs";
import {
  runPhase46ProgramDocGate,
  isPhase46ProgramActive,
  isPhase46ProgramClosed,
} from "./hub-phase46-program-entry-smoke.mjs";

export const PHASE46_PROGRAM_CLOSE_KIND = "chrysalis.phase46-program-close-smoke";
export const PHASE46_PROGRAM_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G9290 — wave 7 close + runtime depth close; honest census (not full 601 claim). */
export async function runPhase46ProgramCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase46ProgramDocGate();
  const buildSlice = await runPhase46BuildSliceGate({ repoRoot });
  const wave7Close = runExtendedMatrixOracleWave7CloseGate();
  const runtimeDepthClose = await runPhase46CwlRuntimeDepthCloseGate({ repoRoot });
  const census = runExtendedMatrixOracleProgressGate();
  const programHonest = isExtendedMatrixCensusProgramHonest(census, {
    minOracleAtClose: 180,
    programClosed: isPhase46ProgramClosed(),
  });
  const closeReady =
    buildSlice.ok === true &&
    wave7Close.ok === true &&
    runtimeDepthClose.ok === true &&
    programHonest === true;
  const ok = program.ok === true && closeReady;
  return {
    kind: PHASE46_PROGRAM_CLOSE_KIND,
    schemaVersion: PHASE46_PROGRAM_CLOSE_SCHEMA_VERSION,
    ok,
    closeReady,
    programHonest,
    programClosed: isPhase46ProgramClosed(),
    programActive: isPhase46ProgramActive(),
    program,
    buildSlice,
    wave7Close,
    runtimeDepthClose,
    census,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase46ProgramCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("phase46-program-close");
  const t0 = progress.start("Phase 46 program close (G9290)");
  const gate = await runPhase46ProgramCloseGate(opts);
  progress.end("Phase 46 program close (G9290)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase46ProgramCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase46-program-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
