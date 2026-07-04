#!/usr/bin/env node
/** Phase 44a track close — wave-1 oracle promotion bar (G9030). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";

export const EXTENDED_MATRIX_WAVE1_CLOSE_KIND = "chrysalis.extended-matrix-oracle-wave1-close-smoke";
export const EXTENDED_MATRIX_WAVE1_CLOSE_SCHEMA_VERSION = 1;

/** G9030 — wave-1 charter minOracle met + census shows extended promotion. */
export function runExtendedMatrixOracleWave1CloseGate() {
  const program = runPhase44ProgramDocGate();
  const progress = runExtendedMatrixOracleProgressGate();
  const wave1 = runExtendedMatrixOracleWaveGate("wave1");
  const wave1Complete =
    wave1.ok === true &&
    wave1.oracleInWave >= (wave1.minOracle ?? 24) &&
    (progress.extendedOracle ?? 0) >= (wave1.minOracle ?? 24);
  const ok = program.ok === true && progress.ok === true && wave1Complete;
  return {
    kind: EXTENDED_MATRIX_WAVE1_CLOSE_KIND,
    schemaVersion: EXTENDED_MATRIX_WAVE1_CLOSE_SCHEMA_VERSION,
    ok,
    wave1Complete,
    program,
    progress,
    wave1,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave1CloseSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave1-close");
  const t0 = progress.start("Extended matrix wave 1 close (G9030)");
  const gate = runExtendedMatrixOracleWave1CloseGate();
  progress.end("Extended matrix wave 1 close (G9030)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave1CloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave1-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
