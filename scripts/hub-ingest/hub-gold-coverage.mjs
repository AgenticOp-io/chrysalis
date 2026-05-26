#!/usr/bin/env node
/**
 * Map hub matrix grades to hub-gold-manifest CI suite coverage.
 * Usage: node scripts/hub-ingest/hub-gold-coverage.mjs [--json-out path]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } from "../chrysalis-hub-store.mjs";
import {
  buildHubGoldSuiteCoverage,
  hubGoldStructuralSuiteIds,
  hubGoldTraceReplaySuiteIds,
} from "./hub-gold-manifest.mjs";
import { verifyTierForPair } from "./hub-route-grades.mjs";

export const HUB_GOLD_COVERAGE_KIND = "chrysalis.hub.gold-coverage";
export const HUB_GOLD_COVERAGE_SCHEMA_VERSION = 1;

/**
 * @param {string} origin
 * @param {string} outputLang
 * @param {{ grade?: string, action?: string }} [route]
 */
export function describeHubGoldPairCoverage(origin, outputLang, route) {
  const r = route ?? HUB_ROUTES[`${origin}:${outputLang}`];
  const coverage = buildHubGoldSuiteCoverage(origin, outputLang);
  const grade = r?.grade ?? "open";
  const action = r?.action ?? "hub-translate";
  const verifyTier = r?.verifyTier ?? verifyTierForPair(origin, outputLang, { action, emitTarget: coverage.emitTarget });
  const hubCiStructural = coverage.suiteCount > 0;
  const chrysalisCiGold = action === "chrysalis-ingest-emit";
  const coverageGap =
    (verifyTier === "oracle" && !chrysalisCiGold) ||
    (verifyTier === "structural" && !hubCiStructural);
  return {
    ...coverage,
    grade,
    action,
    verifyTier,
    hubCiStructural,
    chrysalisCiGold,
    coverageGap,
  };
}

export function buildHubGoldCoverageReport() {
  const pairs = [];
  let goldMatrix = 0;
  let oracleTier = 0;
  let structuralTier = 0;
  let hubCiStructuralPairs = 0;
  let chrysalisCiGoldPairs = 0;
  let coverageGaps = 0;

  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const row = describeHubGoldPairCoverage(src.id, out.id);
      if (row.grade === "gold") goldMatrix += 1;
      if (row.verifyTier === "oracle") oracleTier += 1;
      if (row.verifyTier === "structural") structuralTier += 1;
      if (row.hubCiStructural) hubCiStructuralPairs += 1;
      if (row.chrysalisCiGold) chrysalisCiGoldPairs += 1;
      if (row.coverageGap) coverageGaps += 1;
      pairs.push({ origin: src.id, output: out.id, ...row });
    }
  }

  return {
    kind: HUB_GOLD_COVERAGE_KIND,
    schemaVersion: HUB_GOLD_COVERAGE_SCHEMA_VERSION,
    manifest: {
      structuralSuiteCount: hubGoldStructuralSuiteIds().length,
      traceReplaySuiteCount: hubGoldTraceReplaySuiteIds().length,
    },
    summary: {
      pairCount: pairs.length,
      goldMatrix,
      oracleTier,
      structuralTier,
      hubCiStructuralPairs,
      chrysalisCiGoldPairs,
      coverageGaps,
    },
    pairs,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { jsonOut };
}

async function main() {
  const { jsonOut } = parseArgs(process.argv);
  const report = buildHubGoldCoverageReport();
  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, text, "utf8");
  }
  console.log(text.trimEnd());
  if (report.summary.coverageGaps > 0) process.exit(1);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
