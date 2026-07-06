#!/usr/bin/env node
/** Phase 45 program close (G9190) — honest composite; not 601/601 oracle-product. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase45BuildSliceGate } from "./hub-phase45-build-slice-smoke.mjs";
import { runExtendedMatrixOracleWave5CloseGate } from "./hub-extended-matrix-oracle-wave5-close-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import {
  runPhase45ProgramDocGate,
  isPhase45ProgramActive,
  isPhase45ProgramClosed,
} from "./hub-phase45-program-entry-smoke.mjs";

export const PHASE45_PROGRAM_CLOSE_KIND = "chrysalis.phase45-program-close-smoke";
export const PHASE45_PROGRAM_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G9190 — wave 5 close + build slice; honest census (not full 601 claim). */
export async function runPhase45ProgramCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const program = runPhase45ProgramDocGate();
  const buildSlice = await runPhase45BuildSliceGate({ repoRoot });
  const wave5Close = runExtendedMatrixOracleWave5CloseGate();
  const census = runExtendedMatrixOracleProgressGate();
  const programHonest =
    (census.totalPairs ?? 0) >= 601 &&
    (census.belowTarget ?? 0) > 0 &&
    (census.extendedOracle ?? 0) > 0 &&
    (census.oracleProductCount ?? 0) >= 178 &&
    (census.oracleProductCount ?? 0) < (census.totalPairs ?? 601);
  const closeReady = buildSlice.ok === true && wave5Close.ok === true && programHonest === true;
  const ok = program.ok === true && closeReady;
  return {
    kind: PHASE45_PROGRAM_CLOSE_KIND,
    schemaVersion: PHASE45_PROGRAM_CLOSE_SCHEMA_VERSION,
    ok,
    closeReady,
    programHonest,
    programClosed: isPhase45ProgramClosed(),
    programActive: isPhase45ProgramActive(),
    program,
    buildSlice,
    wave5Close,
    census,
    generatedAt: new Date().toISOString(),
  };
}

export async function runPhase45ProgramCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("phase45-program-close");
  const t0 = progress.start("Phase 45 program close (G9190)");
  const gate = await runPhase45ProgramCloseGate(opts);
  progress.end("Phase 45 program close (G9190)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runPhase45ProgramCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-phase45-program-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
