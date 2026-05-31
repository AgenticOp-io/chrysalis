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
export const HUB_CAPABILITY_MATRIX_SCHEMA_VERSION = 9;

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
    cwlBodyProjection: {
      rfc: "CWL-RFC-0005",
      fixture: "fixtures/hub-gold-cwl-request-body",
      script: "pnpm run hub:cwl-body-roundtrip-smoke",
    },
    hubTranslateE2e: {
      fixture: "fixtures/hub-flagship-plain-php",
      script: "pnpm run hub:translate-e2e-smoke",
    },
    cwlRfcSmokes: [
      "hub:cwl-request-context-smoke",
      "hub:cwl-response-content-type-smoke",
      "hub:cwl-auth-effects-smoke",
      "hub:cwl-rfc-roundtrip-smoke",
    ],
    deliveryPipeline: {
      script: "pnpm run hub:delivery-pipeline-smoke",
    },
    verifyPlaybooks: {
      script: "pnpm run hub:verify-playbooks-smoke",
    },
    hubRunner: {
      script: "pnpm run hub:runner-smoke",
    },
    migrationOs: {
      script: "pnpm run hub:migration-os-smoke",
      smokes: ["hub:migration-contract", "hub:migration-plan", "hub:migration-program"],
    },
    cwlInterchange: {
      previewScript: "pnpm run hub:cwl-preview-smoke",
      openapiScript: "pnpm run hub:cwl-openapi-smoke",
      diffScript: "pnpm run hub:cwl-diff-smoke",
      middlewareScript: "pnpm run hub:cwl-middleware-smoke",
      allRfcRoundtripScript: "pnpm run hub:cwl-all-rfc-roundtrip-smoke",
      pathParamsScript: "pnpm run hub:cwl-path-params-smoke",
      queryParamsScript: "pnpm run hub:cwl-query-params-smoke",
      multiGoldScript: "pnpm run hub:cwl-multi-gold-smoke",
      paramsBatchScript: "pnpm run hub:cwl-params-batch-smoke",
    },
    migrationOsStandalone: {
      siteIntelligenceScript: "pnpm run hub:site-intelligence-smoke",
      migrationAssessmentScript: "pnpm run hub:migration-assessment-smoke",
      chimeraCutoverScript: "pnpm run hub:chimera-cutover-smoke",
      pathKnowledgeScript: "pnpm run hub:path-knowledge-smoke",
      languageCompareScript: "pnpm run hub:language-compare-smoke",
      standaloneBatchScript: "pnpm run hub:migration-os-standalone-batch-smoke",
      symfonyScript: "pnpm run hub:migration-os-symfony-smoke",
    },
    symfonyDeliverySmokes: {
      siteIntelligenceScript: "pnpm run hub:site-intelligence-symfony-smoke",
      pathAdviceScript: "pnpm run hub:path-advice-symfony-smoke",
      verifyGapsScript: "pnpm run hub:verify-gaps-symfony-smoke",
      postTranslateArtifactsScript: "pnpm run hub:post-translate-artifacts-symfony-smoke",
    },
    hubRunnerBatch: {
      script: "pnpm run hub:runner-batch-smoke",
    },
    deliveryPipelineRunner: {
      script: "pnpm run hub:delivery-pipeline-runner-smoke",
    },
    expressDelivery: {
      siteIntelligenceScript: "pnpm run hub:site-intelligence-express-smoke",
      pathAdviceScript: "pnpm run hub:path-advice-express-smoke",
      verifyGapsScript: "pnpm run hub:verify-gaps-express-smoke",
      postTranslateArtifactsScript: "pnpm run hub:post-translate-artifacts-express-smoke",
      migrationAssessmentScript: "pnpm run hub:migration-assessment-express-smoke",
      chimeraCutoverScript: "pnpm run hub:chimera-cutover-express-smoke",
      deliveryBatchScript: "pnpm run hub:express-delivery-batch-smoke",
      projectToCwlScript: "pnpm run hub:project-to-cwl-express-smoke",
    },
    symfonyMigrationOsDelivery: {
      assessmentScript: "pnpm run hub:migration-assessment-symfony-smoke",
      chimeraScript: "pnpm run hub:chimera-cutover-symfony-smoke",
      batchScript: "pnpm run hub:symfony-migration-os-batch-smoke",
    },
    cwlBatchSmokes: {
      paramsRoundtripBatchScript: "pnpm run hub:cwl-params-roundtrip-batch-smoke",
      multiBatchScript: "pnpm run hub:cwl-multi-batch-smoke",
      interchangeBatchScript: "pnpm run hub:cwl-interchange-batch-smoke",
    },
    standaloneBatches: {
      evidenceLiveScript: "pnpm run hub:evidence-live-standalone-batch-smoke",
      translateE2eScript: "pnpm run hub:translate-e2e-standalone-batch-smoke",
      tinyBlogOracleScript: "pnpm run hub:tiny-blog-oracle-batch-smoke",
      cwlFullBatchScript: "pnpm run hub:cwl-full-batch-smoke",
    },
    laravelMinDelivery: {
      siteIntelligenceScript: "pnpm run hub:site-intelligence-laravel-min-smoke",
      pathAdviceScript: "pnpm run hub:path-advice-laravel-min-smoke",
      verifyGapsScript: "pnpm run hub:verify-gaps-laravel-min-smoke",
      postTranslateArtifactsScript: "pnpm run hub:post-translate-artifacts-laravel-min-smoke",
      migrationAssessmentScript: "pnpm run hub:migration-assessment-laravel-min-smoke",
      chimeraCutoverScript: "pnpm run hub:chimera-cutover-laravel-min-smoke",
      deliveryBatchScript: "pnpm run hub:laravel-min-delivery-batch-smoke",
      projectToCwlScript: "pnpm run hub:project-to-cwl-laravel-min-smoke",
      depthBatchScript: "pnpm run hub:laravel-depth-batch-smoke",
      scaffold: "flagship/laravel-min",
    },
    plainPhpDelivery: {
      deliveryBatchScript: "pnpm run hub:plain-php-delivery-batch-smoke",
      migrationOsBatchScript: "pnpm run hub:plain-php-migration-os-batch-smoke",
    },
    threeOriginDelivery: {
      batchScript: "pnpm run hub:three-origin-delivery-batch-smoke",
    },
    oracleStandaloneSmokes: {
      nodeExpressOracleScript: "pnpm run hub:node-express-oracle-standalone-smoke",
      wptpGoldScript: "pnpm run hub:wptp-gold-standalone-smoke",
      contractRoundtripScript: "pnpm run hub:contract-roundtrip-standalone-smoke",
      verifyPlaybooksScript: "pnpm run hub:verify-playbooks-standalone-smoke",
      postTranslateVerifyScript: "pnpm run hub:post-translate-verify-standalone-smoke",
    },
    migrationOsDelivery: {
      pathAdviceScript: "pnpm run hub:path-advice-smoke",
      detectDatabasesScript: "pnpm run hub:detect-databases-smoke",
      postTranslateArtifactsScript: "pnpm run hub:post-translate-artifacts-smoke",
      evidenceTrendScript: "pnpm run hub:evidence-trend-smoke",
      verifyGapsIngestScript: "pnpm run hub:verify-gaps-ingest-smoke",
    },
    nodeOracleProduct: {
      spikeScript: "pnpm run hub:node-oracle-spike",
      expressVerifyScript: "pnpm run hub:node-express-oracle-verify",
    },
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
