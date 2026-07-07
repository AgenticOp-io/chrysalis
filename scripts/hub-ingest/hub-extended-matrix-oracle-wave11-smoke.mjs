#!/usr/bin/env node
/** Maintenance wave 11 — systems-lang rust outbound (G9165). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave11Gate() {
  const progress = runExtendedMatrixOracleProgressGate();
  const wave = runExtendedMatrixOracleWaveGate("wave11");
  const ok = progress.ok === true && wave.wavePairCount > 0 && wave.oracleInWave >= (wave.minOracle ?? 21);
  return {
    kind: "chrysalis.extended-matrix-oracle-wave11-smoke",
    schemaVersion: 1,
    ok,
    progress,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave11Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave11");
  const t0 = progress.start("Extended matrix wave 11 (G9165)");
  const gate = runExtendedMatrixOracleWave11Gate();
  progress.end("Extended matrix wave 11 (G9165)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave11Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave11-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
