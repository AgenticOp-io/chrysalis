#!/usr/bin/env node
/** Maintenance wave 9 — rust/kotlin/scala/swift × native outbound (G9163). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave9Gate() {
  const progress = runExtendedMatrixOracleProgressGate();
  const wave = runExtendedMatrixOracleWaveGate("wave9");
  const ok = progress.ok === true && wave.wavePairCount > 0 && wave.oracleInWave >= (wave.minOracle ?? 24);
  return {
    kind: "chrysalis.extended-matrix-oracle-wave9-smoke",
    schemaVersion: 1,
    ok,
    progress,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave9Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave9");
  const t0 = progress.start("Extended matrix wave 9 (G9163)");
  const gate = runExtendedMatrixOracleWave9Gate();
  progress.end("Extended matrix wave 9 (G9163)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave9Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave9-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
