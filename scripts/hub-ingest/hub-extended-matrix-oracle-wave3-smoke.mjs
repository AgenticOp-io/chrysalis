#!/usr/bin/env node
/** Phase 44a wave 3 — C/C++/SCSS file-lift × web frameworks (G9080). */
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { runExtendedMatrixOracleWaveGate } from "./hub-extended-matrix-oracle-wave.mjs";

export function runExtendedMatrixOracleWave3Gate() {
  const program = runPhase44ProgramDocGate();
  const wave = runExtendedMatrixOracleWaveGate("wave3");
  const ok = program.ok === true && wave.ok === true;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave3-smoke",
    schemaVersion: 1,
    ok,
    program,
    wave,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleWave3Smoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-wave3");
  const t0 = progress.start("Extended matrix wave 3 (G9080)");
  const gate = runExtendedMatrixOracleWave3Gate();
  progress.end("Extended matrix wave 3 (G9080)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleWave3Smoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-wave3-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
