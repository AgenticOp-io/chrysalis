#!/usr/bin/env node
/** Phase 44a wave 1 — file-lift origins × popular outputs (G9010). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLanguageReadinessReport } from "../chrysalis-hub-store.mjs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runExtendedMatrixOracleWave1Gate() {
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json",
  );
  if (!existsSync(charterPath)) return { ok: false, skip: "missing-charter" };
  const charter = JSON.parse(readFileSync(charterPath, "utf8"));
  const wave1 = charter.wave1 ?? {};
  const originSet = new Set(wave1.originIds ?? []);
  const outputSet = new Set(wave1.outputIds ?? []);
  const minOracle = wave1.minOraclePairs ?? 24;
  const report = buildLanguageReadinessReport();
  const wavePairs = (report.pairs ?? []).filter(
    (p) => originSet.has(p.origin) && outputSet.has(p.output) && p.origin !== p.output,
  );
  let oracleInWave = 0;
  for (const p of wavePairs) {
    const cov = describeHubGoldPairCoverage(p.origin, p.output);
    if ((cov.traceReplaySuiteIds?.length ?? 0) > 0) oracleInWave += 1;
  }
  const program = runPhase44ProgramDocGate();
  const ok = program.ok === true && wavePairs.length > 0 && oracleInWave >= minOracle;
  return {
    kind: "chrysalis.extended-matrix-oracle-wave1-smoke",
    schemaVersion: 1,
    ok,
    wavePairCount: wavePairs.length,
    oracleInWave,
    minOracle,
    program,
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
