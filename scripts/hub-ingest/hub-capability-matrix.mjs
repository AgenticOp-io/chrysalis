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
export const HUB_CAPABILITY_MATRIX_SCHEMA_VERSION = 34;

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
      microVerifyBatchScript: "pnpm run hub:php-oracle-micro-verify-batch-smoke",
    },
    phpNextjsVerifyBatch: {
      script: "pnpm run hub:php-nextjs-verify-batch-smoke",
      fixtures: ["fixtures/tiny-blog", "fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony"],
    },
    phpWedgeBatch: {
      script: "pnpm run hub:php-wedge-batch-smoke",
      batchSchemaVersion: 8,
      laravelVerifyGapsBatchScript: "pnpm run hub:laravel-verify-gaps-batch-smoke",
      nodeExpressOracleScript: "pnpm run hub:node-express-oracle-standalone-smoke",
    },
    hubEvidenceMvpBatch: {
      script: "pnpm run hub:evidence-mvp-batch-smoke",
      trendScript: "pnpm run hub:evidence-trend-smoke",
      evidenceSmokeScript: "pnpm run hub:evidence-smoke",
    },
    wptpStrictBatch: {
      script: "pnpm run hub:wptp-strict-batch-smoke",
      requireEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH",
      requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
      nextjsVerifyBatchScript: "pnpm run hub:php-nextjs-verify-batch-smoke",
      wptpGoldScript: "pnpm run hub:wptp-gold-smoke",
    },
    flagshipFullGapsBatch: {
      script: "pnpm run hub:flagship-full-gaps-batch-smoke",
      batchSchemaVersion: 5,
      expressVerifySeedScript: "pnpm run hub:express-flagship-verify-seed",
      flagshipVerifyReplayScript: "pnpm run hub:flagship-verify-replay-batch-smoke",
      flagshipVerifyHttpScript: "pnpm run hub:flagship-verify-http-batch-smoke",
      flagshipVerifyHttpFastifyScript: "pnpm run hub:flagship-verify-http-fastify-batch-smoke",
      requireEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH",
      standaloneScript: "pnpm run hub:flagship-verify-gaps-standalone-smoke",
      fixtures: ["fixtures/hub-flagship-plain-php", "fixtures/hub-flagship-symfony", "fixtures/hub-flagship-express"],
    },
    gapsIngestClosureBatch: {
      script: "pnpm run hub:gaps-ingest-closure-batch-smoke",
      laravelClosureScript: "pnpm run hub:laravel-verify-gaps-ingest-closure-smoke",
      gapReingestScript: "pnpm run hub:gap-reingest-batch-smoke",
      gapReingestBatchSchemaVersion: 6,
      requireEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
      requireGapReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST",
    },
    gapsIngestStrictBatch: {
      script: "pnpm run hub:gaps-ingest-strict-batch-smoke",
      batchSchemaVersion: 7,
      laravelLiveClosureScript: "pnpm run hub:laravel-verify-live-gaps-closure-smoke",
      gapReingestStrictScript: "pnpm run hub:gap-reingest-strict-smoke",
      authProbeReingestScript: "pnpm run hub:laravel-auth-probe-reingest-smoke",
      authProbeVerifyClosureScript: "pnpm run hub:laravel-auth-probe-reingest-verify-closure-smoke",
      authProbeVerifyReplayScript: "pnpm run hub:laravel-auth-probe-reingest-verify-replay-smoke",
      authProbeVerifyHttpScript: "pnpm run hub:laravel-auth-probe-reingest-verify-http-smoke",
      authProbeVerifySeedScript: "pnpm run hub:laravel-auth-probe-verify-seed",
      authProbeVerifyReplayStandaloneScript: "pnpm run hub:laravel-auth-probe-verify-replay",
      authProbeVerifyHttpStandaloneScript: "pnpm run hub:laravel-auth-probe-verify-http",
      authProbeVerifyHttpFastifyScript: "pnpm run hub:laravel-auth-probe-verify-http-fastify",
      flagshipVerifyReplayScript: "pnpm run hub:flagship-verify-replay-batch-smoke",
      flagshipVerifyHttpScript: "pnpm run hub:flagship-verify-http-batch-smoke",
      flagshipVerifyHttpFastifyScript: "pnpm run hub:flagship-verify-http-fastify-batch-smoke",
      requireEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
      requireStrictReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
      requireVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
      requireVerifyReplayEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY",
      requireVerifyHttpEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP",
      requireVerifyHttpTargetEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET",
    },
    laravelAuthProbeReingest: {
      script: "pnpm run hub:laravel-auth-probe-reingest-smoke",
      batchSchemaVersion: 3,
      fixture: "fixtures/laravel-auth-probe",
      backlogFixture: "fixtures/hub-laravel-verify-gaps-backlog",
      verifySeedScript: "pnpm run hub:laravel-auth-probe-verify-seed",
      verifyClosureScript: "pnpm run hub:laravel-auth-probe-reingest-verify-closure-smoke",
      verifyReplayScript: "pnpm run hub:laravel-auth-probe-reingest-verify-replay-smoke",
      verifyHttpScript: "pnpm run hub:laravel-auth-probe-reingest-verify-http-smoke",
    },
    irHelperLifting: {
      script: "pnpm run hub:ir-helper-lifting-smoke",
      fixture: "fixtures/lift-helper-lift-twin",
      flag: "--ingest-lift-shared-helpers",
    },
    irHelperLiftingSemantic: {
      script: "pnpm run hub:ir-helper-lifting-semantic-smoke",
      fixture: "fixtures/lift-helper-gap-probe",
      flags: ["--ingest-lift-shared-helpers", "--ingest-lift-shared-helpers-semantic"],
    },
    irHelperLiftingAttr: {
      script: "pnpm run hub:ir-helper-lifting-attr-smoke",
      fixture: "fixtures/lift-helper-attr-lib",
    },
    irHelperLiftingOracleTwin: {
      script: "pnpm run hub:ir-helper-lifting-oracle-twin-smoke",
      fixtures: ["fixtures/lift-helper-sql-same-twin", "fixtures/lift-helper-sql-case-twin"],
    },
    irHelperLiftingReplayTwin: {
      script: "pnpm run hub:ir-helper-lifting-replay-twin-smoke",
      fixtures: ["fixtures/lift-helper-sql-same-twin", "fixtures/lift-helper-sql-case-twin"],
    },
    irHelperLiftingEmbed: {
      script: "pnpm run hub:ir-helper-lifting-embed-smoke",
      fixture: "fixtures/lift-helper-lift-twin",
      flag: "--ingest-embed-shared-helper-bodies",
    },
    irHelperLiftingFullPath: {
      script: "pnpm run hub:ir-helper-lifting-full-path-smoke",
      fixture: "fixtures/lift-helper-lift-twin",
      flags: [
        "--ingest-lift-shared-helpers",
        "--ingest-lift-shared-helpers-semantic",
        "--ingest-embed-shared-helper-bodies",
      ],
    },
    verifyGapsPost110Reinforcement: {
      script: "pnpm run hub:verify-gaps-post110-reinforcement-smoke",
      batchSchemaVersion: 1,
      authority: "docs/CWL-FULLSTACK-POST-110-PROGRAM.md",
      gcePhaseEnv: "CHRYSALIS_GCE_POST110_PHASE_B",
      requireStrictReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
      requireVerifyHttpTargetEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET",
    },
    laravelAuthProbeReingestVerifyHttpFastify: {
      script: "pnpm run hub:laravel-auth-probe-reingest-verify-http-fastify-smoke",
      fixture: "fixtures/laravel-auth-probe",
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
      schemaVersion: 3,
    },
    deliveryPipelineRunner: {
      script: "pnpm run hub:delivery-pipeline-runner-smoke",
      schemaVersion: 3,
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
    fourOriginDelivery: {
      batchScript: "pnpm run hub:four-origin-delivery-batch-smoke",
    },
    symfonyDelivery: {
      deliveryBatchScript: "pnpm run hub:symfony-delivery-batch-smoke",
    },
    fullDeliveryMega: {
      batchScript: "pnpm run hub:full-delivery-mega-batch-smoke",
    },
    cwlMega: {
      batchScript: "pnpm run hub:cwl-mega-batch-smoke",
    },
    oracleStandaloneBatch: {
      batchScript: "pnpm run hub:oracle-standalone-batch-smoke",
    },
    deliveryPipelineStandalone: {
      batchScript: "pnpm run hub:delivery-pipeline-standalone-batch-smoke",
      laravelMinProfile: "flagship/laravel-min",
    },
    laravelMinOracle: {
      batchScript: "pnpm run hub:laravel-min-oracle-batch-smoke",
      migrationOsBatchScript: "pnpm run hub:laravel-min-migration-os-batch-smoke",
    },
    advisoryStandaloneMega: {
      batchScript: "pnpm run hub:advisory-standalone-mega-batch-smoke",
    },
    allDeliveryUltraMega: {
      batchScript: "pnpm run hub:all-delivery-ultra-mega-batch-smoke",
    },
    migrationOsMega: {
      batchScript: "pnpm run hub:migration-os-mega-batch-smoke",
    },
    oracleProductUltra: {
      batchScript: "pnpm run hub:oracle-product-ultra-batch-smoke",
      batchSchemaVersion: 11,
    },
    expressLaravelMinDelivery: {
      batchScript: "pnpm run hub:express-laravel-min-delivery-batch-smoke",
    },
    symfonyLaravelMinDelivery: {
      batchScript: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke",
    },
    postTranslateVerifyOrigins: {
      batchScript: "pnpm run hub:post-translate-verify-origin-batch-smoke",
    },
    tinyBlogDepth: {
      batchScript: "pnpm run hub:tiny-blog-depth-batch-smoke",
      projectToCwlScript: "pnpm run hub:project-to-cwl-tiny-blog-smoke",
    },
    contractVerifyStandalone: {
      batchScript: "pnpm run hub:contract-verify-standalone-batch-smoke",
    },
    chimeraCutoverOrigin: {
      batchScript: "pnpm run hub:chimera-cutover-origin-batch-smoke",
    },
    migrationAssessmentOrigin: {
      batchScript: "pnpm run hub:migration-assessment-origin-batch-smoke",
    },
    verifyGapsOrigin: {
      batchScript: "pnpm run hub:verify-gaps-origin-batch-smoke",
      batchSchemaVersion: 2,
    },
    postTranslateArtifactsOrigin: {
      batchScript: "pnpm run hub:post-translate-artifacts-origin-batch-smoke",
    },
    verifyStandaloneMega: {
      batchScript: "pnpm run hub:verify-standalone-mega-batch-smoke",
    },
    contractStandaloneMega: {
      batchScript: "pnpm run hub:contract-standalone-mega-batch-smoke",
    },
    evidenceStandaloneMega: {
      batchScript: "pnpm run hub:evidence-standalone-mega-batch-smoke",
      batchSchemaVersion: 9,
    },
    originDepth: {
      plainPhpBatchScript: "pnpm run hub:plain-php-depth-batch-smoke",
      symfonyBatchScript: "pnpm run hub:symfony-depth-batch-smoke",
      expressBatchScript: "pnpm run hub:express-depth-batch-smoke",
      laravelMinBatchScript: "pnpm run hub:laravel-min-depth-batch-smoke",
      ultraBatchScript: "pnpm run hub:origin-depth-ultra-batch-smoke",
      projectToCwlPlainPhpScript: "pnpm run hub:project-to-cwl-plain-php-smoke",
      projectToCwlSymfonyScript: "pnpm run hub:project-to-cwl-symfony-smoke",
    },
    chimeraAssessmentMega: {
      batchScript: "pnpm run hub:chimera-assessment-mega-batch-smoke",
    },
    verifyProductUltra: {
      batchScript: "pnpm run hub:verify-product-ultra-batch-smoke",
      batchSchemaVersion: 10,
    },
    cwlAllOrigins: {
      allOriginsScript: "pnpm run hub:project-to-cwl-all-origins",
      batchScript: "pnpm run hub:cwl-all-origins-batch-smoke",
      universalMegaBatchScript: "pnpm run hub:cwl-universal-mega-batch-smoke",
      appStackBatchScript: "pnpm run hub:cwl-app-stack-origins-batch-smoke",
      assetBatchScript: "pnpm run hub:cwl-asset-origins-batch-smoke",
      patternLiteralCwlBatchScript: "pnpm run hub:cwl-pattern-literal-cwl-batch-smoke",
      patternLiteralRoundtripBatchScript: "pnpm run hub:cwl-pattern-literal-roundtrip-batch-smoke",
      flagshipRoundtripBatchScript: "pnpm run hub:cwl-flagship-roundtrip-batch-smoke",
      translateCwlCoverageScript: "pnpm run hub:translate-cwl-coverage-smoke",
      translateCwlRoundtripScript: "pnpm run hub:translate-cwl-roundtrip-smoke",
      projectToCwlRoundtripScript: "pnpm run hub:project-to-cwl-roundtrip-smoke",
      contractImportCwlRoundtripScript: "pnpm run hub:contract-import-cwl-roundtrip-smoke",
      universalMegaBatchSchemaVersion: 4,
      originCount: 23,
      patternLiteralCwlSuiteCount: 18,
      patternLiteralRoundtripSuiteCount: 21,
      flagshipRoundtripSuiteCount: 3,
      translateCwlOriginCount: 23,
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
    strategicPlanPhase8ProductProof: {
      doc: "docs/PRODUCT-PROOF-PHASE-8.md",
      closeSmokeScript: "pnpm run hub:strategic-plan-phase8-product-proof-close-smoke",
      strictGceScript: "pnpm run test:gce:phase8-strict",
      gceMarker: "reports/ci/gce-phase8-strict.ok",
      hubCompletionSection: "phase8ProductProof",
      hubCompletionSchemaVersion: 512,
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
