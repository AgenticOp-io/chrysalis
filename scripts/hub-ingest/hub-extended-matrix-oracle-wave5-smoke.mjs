#!/usr/bin/env node
/** Phase 45a wave 5 — Markdown/YAML/Vue config-lift × CWL (G9175). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase45ProgramDocGate } from "./hub-phase45-program-entry-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave5Gate() {
  const program = runPhase45ProgramDocGate();
  const wave = runExtendedMatrixOracleWaveGate("wave5");
  const ok = program.ok === true && wave.ok === true;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave5-smoke",
    schemaVersion: 1,
    ok,
    program,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave5Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave5");
  const t0 = progress.start("Extended matrix wave 5 (G9175)");
  const gate = runExtendedMatrixOracleWave5Gate();
  progress.end("Extended matrix wave 5 (G9175)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave5Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave5-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
