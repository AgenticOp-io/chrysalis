#!/usr/bin/env node
/**
 * Machine-readable capability tiers (STRATEGIC-PLAN Phase 0 / G88).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubGoldCoverageReport } from "./hub-gold-coverage.mjs";
import { hubGoldStructuralSuiteIds, hubGoldTraceReplaySuiteIds } from "./hub-gold-manifest.mjs";

import { ORACLE_MICRO_FIXTURE } from "./hub-php-oracle-micro-fixture.mjs";

export const HUB_CAPABILITY_MATRIX_KIND = "chrysalis.hub.capability-matrix";
export const HUB_CAPABILITY_MATRIX_SCHEMA_VERSION = 3;

/** @type {const} */
export const ORACLE_PRODUCT_PAIRS = [
  { origin: "php", output: "hono", fixture: "fixtures/tiny-blog" },
  { origin: "php", output: "fastify", fixture: "fixtures/tiny-blog" },
  { origin: "php", output: "nextjs", fixture: "fixtures/tiny-blog" },
  { origin: "php", output: "typescript", fixture: "fixtures/tiny-blog" },
  {
    origin: "php",
    output: "hono",
    fixture: "fixtures/hub-flagship-plain-php",
    program: "hub-plain-php-flagship",
    note: "plain PHP pilot (chrysalis.routes.json, no framework)",
  },
  {
    origin: "php",
    output: "hono",
    fixture: "fixtures/hub-flagship-symfony",
    program: "hub-symfony-flagship",
    note: "Symfony layout pilot (__invoke controllers + routes.yaml mirror)",
  },
  {
    origin: "javascript",
    output: "hono",
    fixture: "fixtures/hub-flagship-express",
    program: "hub-node-express-oracle-verify",
    note: "second-origin pilot (live Express capture + verify replay)",
  },
];

export function buildHubCapabilityMatrixReport() {
  const coverage = buildHubGoldCoverageReport();
  const structuralSuiteCount = hubGoldStructuralSuiteIds().length;
  const traceReplaySuiteCount = hubGoldTraceReplaySuiteIds().length;
  const oraclePairs = ORACLE_PRODUCT_PAIRS.map((p) => ({
    ...p,
    tier: "oracle-product",
    verifyTier: "oracle",
    action: "chrysalis-ingest-emit",
  }));

  return {
    kind: HUB_CAPABILITY_MATRIX_KIND,
    schemaVersion: HUB_CAPABILITY_MATRIX_SCHEMA_VERSION,
    tiers: {
      oracleProduct: {
        description: "Capture + ingest + emit + verify on real traces",
        pairCount: oraclePairs.length,
        pairs: oraclePairs,
      },
      structuralPlumbing: {
        description: "Hub gold structural + trace replay on literal/CWL fixtures",
        structuralSuiteCount,
        traceReplaySuiteCount,
        hubCiStructuralPairs: coverage.summary.hubCiStructuralPairs,
      },
      scaffoldAdvisory: {
        description: "Path knowledge, migration planner, scans — planning only",
        apis: ["/api/hub/migration-plan", "/api/hub/detect-databases", "/api/hub/language-compare"],
      },
      paused: {
        description: "Not sold without plan amendment",
        examples: ["any-language-production", "matrix-gold-as-headline", "wordpress-estate"],
      },
    },
    coverage: coverage.summary,
    oracleMicroFixture: {
      fixture: ORACLE_MICRO_FIXTURE,
      script: "pnpm run hub:oracle-micro-fixture",
    },
    nextjsFlagshipFixtures: [
      "fixtures/hub-flagship-plain-php",
      "fixtures/hub-flagship-symfony",
    ],
    projectToCwlOrigins: ["php", "javascript"],
    externalCopy: {
      headline: "Verified PHP backend migration with oracle replay",
      avoid: ["575 languages production-ready", "convert any website without oracle"],
    },
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
  const report = buildHubCapabilityMatrixReport();
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
