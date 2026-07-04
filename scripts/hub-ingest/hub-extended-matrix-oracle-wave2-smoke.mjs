#!/usr/bin/env node
/** Phase 44a wave 2 — pattern-lift + CWL origins (G9020). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave2Gate() {
  const program = runPhase44ProgramDocGate();
  const wave = runExtendedMatrixOracleWaveGate("wave2");
  const ok = program.ok === true && wave.ok === true;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave2-smoke",
    schemaVersion: 1,
    ok,
    program,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave2Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave2");
  const t0 = progress.start("Extended matrix wave 2 (G9020)");
  const gate = runExtendedMatrixOracleWave2Gate();
  progress.end("Extended matrix wave 2 (G9020)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave2Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave2-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
