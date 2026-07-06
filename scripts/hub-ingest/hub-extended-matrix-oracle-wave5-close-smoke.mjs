#!/usr/bin/env node
/** Phase 45a wave 5 track close (G9176). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase45ProgramDocGate } from "./hub-phase45-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runExtendedMatrixOracleWave4CloseGate } from "./hub-extended-matrix-oracle-wave4-close-smoke.mjs";

export const EXTENDED_MATRIX_WAVE5_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave5-close-smoke";
export const EXTENDED_MATRIX_WAVE5_CLOSE_SCHEMA_VERSION = 1;

export function runExtendedMatrixOracleWave5CloseGate() {
  const program = runPhase45ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave4Close = runExtendedMatrixOracleWave4CloseGate();
  const wave5 = runExtendedMatrixOracleWaveGate("wave5");
  const wave5Complete = wave5.ok === true && wave5.oracleInWave >= (wave5.minOracle ?? 3);
  const ok = program.ok === true && progress.ok === true && wave4Close.ok === true && wave5Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE5_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE5_CLOSE_SCHEMA_VERSION,
    ok,
    wave5Complete,
    program,
    progress,
    wave4Close,
    wave5,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave5CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave5-close");
  const t0 = progress.start("Extended matrix wave 5 close (G9176)");
  const gate = runExtendedMatrixOracleWave5CloseGate();
  progress.end("Extended matrix wave 5 close (G9176)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave5CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave5-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
