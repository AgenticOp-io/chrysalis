#!/usr/bin/env node
/** Maintenance wave 14 — asset outbound manifest oracle (G9168). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave14Gate() {
  const progress = runExtendedMatrixOracleProgressGate();
  const wave = runExtendedMatrixOracleWaveGate("wave14");
  const ok = progress.ok === true && wave.wavePairCount > 0 && wave.oracleInWave >= (wave.minOracle ?? 210);
  return {
    kind: "chrysalis.extended-matrix-oracle-wave14-smoke",
    schemaVersion: 1,
    ok,
    progress,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave14Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave14");
  const t0 = progress.start("Extended matrix wave 14 (G9168)");
  const gate = runExtendedMatrixOracleWave14Gate();
  progress.end("Extended matrix wave 14 (G9168)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave14Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave14-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
