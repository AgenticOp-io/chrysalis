#!/usr/bin/env node
/** Maintenance wave 15 — swift outbound native oracle (G9169). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave15Gate() {
  const progress = runExtendedMatrixOracleProgressGate();
  const wave = runExtendedMatrixOracleWaveGate("wave15");
  const ok = progress.ok === true && wave.wavePairCount > 0 && wave.oracleInWave >= (wave.minOracle ?? 23);
  return {
    kind: "chrysalis.extended-matrix-oracle-wave15-smoke",
    schemaVersion: 1,
    ok,
    progress,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave15Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave15");
  const t0 = progress.start("Extended matrix wave 15 (G9169)");
  const gate = runExtendedMatrixOracleWave15Gate();
  progress.end("Extended matrix wave 15 (G9169)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave15Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave15-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
