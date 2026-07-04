#!/usr/bin/env node
/** Phase 44a wave 2 track close (G9040). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runExtendedMatrixOracleWave1CloseGate } from "./hub-extended-matrix-oracle-wave1-close-smoke.mjs";

export const EXTENDED_MATRIX_WAVE2_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave2-close-smoke";
export const EXTENDED_MATRIX_WAVE2_CLOSE_SCHEMA_VERSION = 1;

export function runExtendedMatrixOracleWave2CloseGate() {
  const program = runPhase44ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave1Close = runExtendedMatrixOracleWave1CloseGate();
  const wave2 = runExtendedMatrixOracleWaveGate("wave2");
  const wave2Complete = wave2.ok === true && wave2.oracleInWave >= (wave2.minOracle ?? 20);
  const ok = program.ok === true && progress.ok === true && wave1Close.ok === true && wave2Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE2_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE2_CLOSE_SCHEMA_VERSION,
    ok,
    wave2Complete,
    program,
    progress,
    wave1Close,
    wave2,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave2CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave2-close");
  const t0 = progress.start("Extended matrix wave 2 close (G9040)");
  const gate = runExtendedMatrixOracleWave2CloseGate();
  progress.end("Extended matrix wave 2 close (G9040)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave2CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave2-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
