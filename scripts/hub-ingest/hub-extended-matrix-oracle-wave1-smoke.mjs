#!/usr/bin/env node
/** Phase 44a wave 1 — file-lift origins × popular outputs (G9010). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave1Gate() {
  const program = runPhase44ProgramDocGate();
  const wave = runExtendedMatrixOracleWaveGate("wave1");
  const ok = program.ok === true && wave.ok === true;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave1-smoke",
    schemaVersion: 1,
    ok,
    wavePairCount: wave.wavePairCount,
    oracleInWave: wave.oracleInWave,
    minOracle: wave.minOracle,
    program,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave1Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave1");
  const t0 = progress.start("Extended matrix wave 1 (G9010)");
  const gate = runExtendedMatrixOracleWave1Gate();
  progress.end("Extended matrix wave 1 (G9010)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave1Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave1-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
