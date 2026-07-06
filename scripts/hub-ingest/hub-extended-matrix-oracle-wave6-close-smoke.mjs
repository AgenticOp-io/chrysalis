#!/usr/bin/env node
/** Phase 46a wave 6 track close (G9276). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46ProgramDocGate } from "./hub-phase46-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runExtendedMatrixOracleWave5CloseGate } from "./hub-extended-matrix-oracle-wave5-close-smoke.mjs";

export const EXTENDED_MATRIX_WAVE6_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave6-close-smoke";
export const EXTENDED_MATRIX_WAVE6_CLOSE_SCHEMA_VERSION = 1;

export function runExtendedMatrixOracleWave6CloseGate() {
  const program = runPhase46ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave5Close = runExtendedMatrixOracleWave5CloseGate();
  const wave6 = runExtendedMatrixOracleWaveGate("wave6");
  const wave6Complete = wave6.ok === true && wave6.oracleInWave >= (wave6.minOracle ?? 2);
  const ok = program.ok === true && progress.ok === true && wave5Close.ok === true && wave6Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE6_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE6_CLOSE_SCHEMA_VERSION,
    ok,
    wave6Complete,
    program,
    progress,
    wave5Close,
    wave6,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave6CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave6-close");
  const t0 = progress.start("Extended matrix wave 6 close (G9276)");
  const gate = runExtendedMatrixOracleWave6CloseGate();
  progress.end("Extended matrix wave 6 close (G9276)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave6CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave6-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
