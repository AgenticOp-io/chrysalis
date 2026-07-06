#!/usr/bin/env node
/** Phase 45a wave 4 track close (G9166). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase45ProgramDocGate } from "./hub-phase45-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runExtendedMatrixOracleWave3CloseGate } from "./hub-extended-matrix-oracle-wave3-close-smoke.mjs";

export const EXTENDED_MATRIX_WAVE4_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave4-close-smoke";
export const EXTENDED_MATRIX_WAVE4_CLOSE_SCHEMA_VERSION = 1;

export function runExtendedMatrixOracleWave4CloseGate() {
  const program = runPhase45ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave3Close = runExtendedMatrixOracleWave3CloseGate();
  const wave4 = runExtendedMatrixOracleWaveGate("wave4");
  const wave4Complete = wave4.ok === true && wave4.oracleInWave >= (wave4.minOracle ?? 8);
  const ok = program.ok === true && progress.ok === true && wave3Close.ok === true && wave4Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE4_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE4_CLOSE_SCHEMA_VERSION,
    ok,
    wave4Complete,
    program,
    progress,
    wave3Close,
    wave4,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave4CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave4-close");
  const t0 = progress.start("Extended matrix wave 4 close (G9166)");
  const gate = runExtendedMatrixOracleWave4CloseGate();
  progress.end("Extended matrix wave 4 close (G9166)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave4CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave4-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
