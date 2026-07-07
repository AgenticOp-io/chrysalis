#!/usr/bin/env node
/** Phase 44 program close (G9140) — honest composite; not 601/601 oracle-product. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44BuildSliceGate } from "./hub-phase44-build-slice-smoke.mjs";
import { runExtendedMatrixOracleProgressGate, isExtendedMatrixCensusProgramHonest } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import {
  runPhase44ProgramDocGate,
  isPhase44ProgramActive,
  isPhase44ProgramClosed,
} from "./hub-phase44-program-entry-smoke.mjs";

export const PHASE44_PROGRAM_CLOSE_KIND = "chrysalis.phase44-program-close-smoke";
export const PHASE44_PROGRAM_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G9140 — all track closes green; honest census (extended promotion, not full 601 claim). */
export async function runPhase44ProgramCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase44ProgramDocGate();
  const buildSlice = await runPhase44BuildSliceGate({ repoRoot });
  const census = runExtendedMatrixOracleProgressGate();
  const programHonest = isExtendedMatrixCensusProgramHonest(census, {
    minOracleAtClose: 169,
    programClosed: isPhase44ProgramClosed(),
  });
  const programClosed = isPhase44ProgramClosed();
  const closeReady = buildSlice.ok === true && programHonest === true;
  const ok = program.ok === true && closeReady;
  return {
    kind: PHASE44_PROGRAM_CLOSE_KIND,
    schemaVersion: PHASE44_PROGRAM_CLOSE_SCHEMA_VERSION,
    ok,
    closeReady,
    programHonest,
    programClosed,
    programActive: isPhase44ProgramActive(),
    program,
    buildSlice,
    census,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase44ProgramCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("phase44-program-close");
  const t0 = progress.start("Phase 44 program close (G9140)");
  const gate = await runPhase44ProgramCloseGate(opts);
  progress.end("Phase 44 program close (G9140)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase44ProgramCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase44-program-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
