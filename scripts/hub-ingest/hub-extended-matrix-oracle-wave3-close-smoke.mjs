#!/usr/bin/env node
/** Phase 44a wave 3 track close (G9085). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runExtendedMatrixOracleWave2CloseGate } from "./hub-extended-matrix-oracle-wave2-close-smoke.mjs";

export const EXTENDED_MATRIX_WAVE3_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave3-close-smoke";
export const EXTENDED_MATRIX_WAVE3_CLOSE_SCHEMA_VERSION = 1;

export function runExtendedMatrixOracleWave3CloseGate() {
  const program = runPhase44ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave2Close = runExtendedMatrixOracleWave2CloseGate();
  const wave3 = runExtendedMatrixOracleWaveGate("wave3");
  const wave3Complete = wave3.ok === true && wave3.oracleInWave >= (wave3.minOracle ?? 12);
  const ok = program.ok === true && progress.ok === true && wave2Close.ok === true && wave3Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE3_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE3_CLOSE_SCHEMA_VERSION,
    ok,
    wave3Complete,
    program,
    progress,
    wave2Close,
    wave3,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave3CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave3-close");
  const t0 = progress.start("Extended matrix wave 3 close (G9085)");
  const gate = runExtendedMatrixOracleWave3CloseGate();
  progress.end("Extended matrix wave 3 close (G9085)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave3CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave3-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
