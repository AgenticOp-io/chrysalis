#!/usr/bin/env node
/** Phase 46a wave 7 track close (G9286). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46ProgramDocGate } from "./hub-phase46-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runExtendedMatrixOracleWave6CloseGate } from "./hub-extended-matrix-oracle-wave6-close-smoke.mjs";

export const EXTENDED_MATRIX_WAVE7_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave7-close-smoke";
export const EXTENDED_MATRIX_WAVE7_CLOSE_SCHEMA_VERSION = 1;

export function runExtendedMatrixOracleWave7CloseGate() {
  const program = runPhase46ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave6Close = runExtendedMatrixOracleWave6CloseGate();
  const wave7 = runExtendedMatrixOracleWaveGate("wave7");
  const wave7Complete = wave7.ok === true && wave7.oracleInWave >= (wave7.minOracle ?? 8);
  const ok = program.ok === true && progress.ok === true && wave6Close.ok === true && wave7Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE7_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE7_CLOSE_SCHEMA_VERSION,
    ok,
    wave7Complete,
    program,
    progress,
    wave6Close,
    wave7,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave7CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave7-close");
  const t0 = progress.start("Extended matrix wave 7 close (G9286)");
  const gate = runExtendedMatrixOracleWave7CloseGate();
  progress.end("Extended matrix wave 7 close (G9286)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave7CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave7-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
