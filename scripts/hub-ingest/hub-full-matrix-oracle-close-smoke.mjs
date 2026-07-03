#!/usr/bin/env node
/** Phase 41f program close smoke (G8790) — honest composite; programComplete when matrix is oracle-product. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase41MasterBuildSliceGate } from "./hub-phase41-master-build-slice-smoke.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";

export const FULL_MATRIX_ORACLE_CLOSE_SMOKE_KIND = "chrysalis.full-matrix-oracle-close-smoke";
export const FULL_MATRIX_ORACLE_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G8790 — all track slices green; program close only when progress census reports complete. */
export async function runFullMatrixOracleCloseGate(opts = {}) {
  const master = await runPhase41MasterBuildSliceGate(opts);
  const progress = runFullMatrixOracleProgressGate();
  const programComplete = progress.programComplete === true;
  return {
    kind: FULL_MATRIX_ORACLE_CLOSE_SMOKE_KIND,
    schemaVersion: FULL_MATRIX_ORACLE_CLOSE_SMOKE_SCHEMA_VERSION,
    ok: master.ok === true && progress.ok === true,
    programComplete,
    closeReady: programComplete,
    masterSlice: master,
    matrixProgress: progress,
    generatedAt: new Date().toISOString(),
  };
}

export async function runFullMatrixOracleCloseSmoke(opts = {}) {
  const progress = createSmokeProgress("full-matrix-oracle-close");
  const t0 = progress.start("Full matrix oracle close (G8790)");
  const gate = await runFullMatrixOracleCloseGate(opts);
  progress.end("Full matrix oracle close (G8790)", gate.ok === true, t0);
  return { kind: FULL_MATRIX_ORACLE_CLOSE_SMOKE_KIND, schemaVersion: FULL_MATRIX_ORACLE_CLOSE_SMOKE_SCHEMA_VERSION, ok: gate.ok === true, gate };
}

async function main() {
  const r = await runFullMatrixOracleCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-full-matrix-oracle-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
