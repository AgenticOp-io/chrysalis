#!/usr/bin/env node
/** Full matrix oracle progress smoke (G8701) — honest grade census for core 9×9 matrix. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLanguageReadinessReport } from "../chrysalis-hub-store.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runFullMatrixOracleProgramDocGate } from "./hub-full-matrix-oracle-program-entry-smoke.mjs";
import { describeHubGoldPairCoverage } from "./hub-gold-coverage.mjs";

export const FULL_MATRIX_ORACLE_PROGRESS_SMOKE_KIND = "chrysalis.full-matrix-oracle-progress-smoke";
export const FULL_MATRIX_ORACLE_PROGRESS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const CORE_LANGUAGE_IDS = [
  "cwl",
  "csharp",
  "go",
  "java",
  "javascript",
  "php",
  "python",
  "ruby",
  "typescript",
];

/** G8701 — census core matrix pairs by grade; ok only when all oracle-product (program not closed yet). */
export function runFullMatrixOracleProgressGate() {
  const charterPath = join(
    scriptRoot,
    "fixtures/hub-full-matrix-oracle/chrysalis.matrix-oracle-composer.v1.json",
  );
  if (!existsSync(charterPath)) {
    return { ok: false, skip: "missing-matrix-oracle-charter" };
  }
  const charter = JSON.parse(readFileSync(charterPath, "utf8"));
  const report = buildLanguageReadinessReport();
  const coreSet = new Set(CORE_LANGUAGE_IDS);
  const pairs = (report.pairs ?? []).filter(
    (p) => coreSet.has(p.origin) && coreSet.has(p.output) && p.origin !== p.output,
  );
  const byGrade = { gold: 0, silver: 0, open: 0, other: 0 };
  const blockers = {};
  /** @type {Array<{ origin: string, output: string, traceReplaySuiteIds: string[] }>} */
  const oracleProductPairs = [];
  /** @type {Array<{ origin: string, output: string, roundTripSuiteIds: string[] }>} */
  const roundTripProductPairs = [];
  for (const p of pairs) {
    const g = p.grade ?? "open";
    if (g in byGrade) byGrade[g] += 1;
    else byGrade.other += 1;
    const key = p.next ?? "unknown";
    blockers[key] = (blockers[key] ?? 0) + 1;
    const gold = describeHubGoldPairCoverage(p.origin, p.output);
    if (gold.suiteCount > 0 && gold.traceReplaySuiteIds.length > 0) {
      oracleProductPairs.push({
        origin: p.origin,
        output: p.output,
        traceReplaySuiteIds: gold.traceReplaySuiteIds,
      });
    }
    if (gold.suiteCount > 0 && gold.roundTripSuiteIds.length > 0) {
      roundTripProductPairs.push({
        origin: p.origin,
        output: p.output,
        roundTripSuiteIds: gold.roundTripSuiteIds,
      });
    }
  }
  const targetTier = charter.targetTier ?? "oracle-product";
  const oracleProductCount = oracleProductPairs.length;
  const roundTripProductCount = roundTripProductPairs.length;
  const structuralGoldCount = byGrade.gold;
  const belowTarget = pairs.length - oracleProductCount;
  const doc = runFullMatrixOracleProgramDocGate();
  const programComplete =
    pairs.length === (charter.pairCount ?? 72) &&
    belowTarget === 0 &&
    byGrade.open === (charter.maxCoreMatrixOpenPairs ?? 0);
  const ok = doc.ok === true && pairs.length === (charter.pairCount ?? 72);
  return {
    ok,
    programComplete,
    targetTier,
    pairCount: pairs.length,
    expectedPairCount: charter.pairCount ?? 72,
    byGrade,
    oracleProductCount,
    oracleProductPairs,
    roundTripProductCount,
    roundTripProductPairs,
    structuralGoldCount,
    belowTarget,
    blockers,
    tracks: charter.tracks ?? [],
    docOk: doc.ok === true,
  };
}

export async function runFullMatrixOracleProgressSmoke(opts = {}) {
  const progress = createSmokeProgress("full-matrix-oracle-progress");
  const t0 = progress.start("Full matrix oracle progress (G8701)");
  const gate = runFullMatrixOracleProgressGate();
  progress.end("Full matrix oracle progress (G8701)", gate.ok === true, t0);
  return {
    kind: FULL_MATRIX_ORACLE_PROGRESS_SMOKE_KIND,
    schemaVersion: FULL_MATRIX_ORACLE_PROGRESS_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runFullMatrixOracleProgressSmoke();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-full-matrix-oracle-progress-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
