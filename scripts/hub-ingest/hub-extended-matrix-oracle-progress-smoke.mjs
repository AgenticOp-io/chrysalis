#!/usr/bin/env node
/** Phase 44a — extended hub matrix oracle census (G9001). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLanguageReadinessReport, hubDirectedPairCount } from "../chrysalis-hub-store.mjs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runPhase44ProgramDocGate } from "./hub-phase44-program-entry-smoke.mjs";
import { isPhase45ProgramActive, runPhase45ProgramDocGate } from "./hub-phase45-program-entry-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const CORE_LANGUAGE_IDS = new Set([
  "cwl",
  "csharp",
  "go",
  "java",
  "javascript",
  "php",
  "python",
  "ruby",
  "typescript",
]);

export function runExtendedMatrixOracleProgressGate() {
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-extended-matrix-oracle/chrysalis.extended-matrix-charter.v1.json",
  );
  if (!existsSync(charterPath)) return { ok: false, skip: "missing-extended-matrix-charter" };
  const charter = JSON.parse(readFileSync(charterPath, "utf8"));
  const program = isPhase45ProgramActive() ? runPhase45ProgramDocGate() : runPhase44ProgramDocGate();
  const report = buildLanguageReadinessReport();
  const pairs = report.pairs ?? [];
  const totalPairs = hubDirectedPairCount();
  let oracleProductCount = 0;
  let coreOracle = 0;
  let extendedOracle = 0;
  for (const p of pairs) {
    const cov = describeHubGoldPairCoverage(p.origin, p.output);
    const isOracle = (cov.traceReplaySuiteIds?.length ?? 0) > 0;
    if (isOracle) {
      oracleProductCount += 1;
      const isCore = CORE_LANGUAGE_IDS.has(p.origin) && CORE_LANGUAGE_IDS.has(p.output);
      if (isCore) coreOracle += 1;
      else extendedOracle += 1;
    }
  }
  const belowTarget = totalPairs - oracleProductCount;
  const ok =
    program.ok === true &&
    pairs.length === totalPairs &&
    coreOracle >= (charter.coreOraclePairs ?? 72) &&
    oracleProductCount > (charter.coreOraclePairs ?? 72);
  return {
    kind: "chrysalis.extended-matrix-oracle-progress-smoke",
    schemaVersion: 1,
    ok,
    totalPairs,
    oracleProductCount,
    coreOracle,
    extendedOracle,
    belowTarget,
    program,
    generatedAt: new Date().toISOString(),
  };
}

export async function runExtendedMatrixOracleProgressSmoke() {
  const progress = createSmokeProgress("extended-matrix-oracle-progress");
  const t0 = progress.start("Extended matrix oracle progress (G9001)");
  const gate = runExtendedMatrixOracleProgressGate();
  progress.end("Extended matrix oracle progress (G9001)", gate.ok === true, t0);
  return { ok: gate.ok === true, gate };
}

async function main() {
  const r = await runExtendedMatrixOracleProgressSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-extended-matrix-oracle-progress-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
