#!/usr/bin/env node
/** Phase 46a wave 6 — JSON/CSS file-lift × CWL trace-replay (G9275). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase46ProgramDocGate } from "./hub-phase46-program-entry-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave6Gate() {
  const program = runPhase46ProgramDocGate();
  const wave = runExtendedMatrixOracleWaveGate("wave6");
  const ok = program.ok === true && wave.ok === true;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave6-smoke",
    schemaVersion: 1,
    ok,
    program,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave6Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave6");
  const t0 = progress.start("Extended matrix wave 6 (G9275)");
  const gate = runExtendedMatrixOracleWave6Gate();
  progress.end("Extended matrix wave 6 (G9275)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave6Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave6-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
