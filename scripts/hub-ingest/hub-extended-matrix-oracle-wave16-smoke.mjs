#!/usr/bin/env node
/** Maintenance wave 16 — php/cwl origin backfill (G9172). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave16Gate() {
  const progress = runExtendedMatrixOracleProgressGate();
  const wave = runExtendedMatrixOracleWaveGate("wave16");
  const ok = progress.ok === true && wave.wavePairCount > 0 && wave.oracleInWave >= (wave.minOracle ?? 26);
  return {
    kind: "chrysalis.extended-matrix-oracle-wave16-smoke",
    schemaVersion: 1,
    ok,
    progress,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave16Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave16");
  const t0 = progress.start("Extended matrix wave 16 (G9172)");
  const gate = runExtendedMatrixOracleWave16Gate();
  progress.end("Extended matrix wave 16 (G9172)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave16Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave16-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
