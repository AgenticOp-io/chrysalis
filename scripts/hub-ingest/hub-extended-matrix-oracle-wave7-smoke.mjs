#!/usr/bin/env node
/** Phase 46a wave 7 — JSON/CSS × enterprise web outputs (G9285). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46ProgramDocGate } from "./hub-phase46-program-entry-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave7Gate() {
  const program = runPhase46ProgramDocGate();
  const wave = runExtendedMatrixOracleWaveGate("wave7");
  const ok = program.ok === true && wave.wavePairCount > 0;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave7-smoke",
    schemaVersion: 1,
    ok,
    program,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave7Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave7");
  const t0 = progress.start("Extended matrix wave 7 (G9285)");
  const gate = runExtendedMatrixOracleWave7Gate();
  progress.end("Extended matrix wave 7 (G9285)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave7Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave7-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
