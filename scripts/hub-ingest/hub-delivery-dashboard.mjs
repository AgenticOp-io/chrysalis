#!/usr/bin/env node
/**
 * Console delivery dashboard aggregate (G152).
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubEvidenceReport } from "./hub-evidence.mjs";
import { buildMigrationAssessment } from "./hub-migration-assessment.mjs";
import { buildProjectVerifyGapsIngestReport } from "./hub-verify-gaps-ingest.mjs";
import { buildChimeraCutoverRunbook } from "./hub-chimera-cutover.mjs";
import { buildHubLicenseStatusReport } from "./hub-license-status.mjs";
import { buildCwlPreviewReport } from "./hub-cwl-preview.mjs";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";
import { buildOracleMicroFixtureReport } from "./hub-php-oracle-micro-fixture.mjs";

export const HUB_DELIVERY_DASHBOARD_KIND = "chrysalis.hub.delivery-dashboard";
export const HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION = 32;

const ARTIFACT_FILES = [
  "site-intelligence.json",
  "path-advice.json",
  "migration-assessment.json",
  "verify-gaps-ingest.json",
  "verify-gaps-ingest-action.json",
  "chimera-cutover.json",
  "cwl-preview.json",
  "migration.cwl",
  "cwl-export.json",
  "evidence-history.jsonl",
];

/**
 * @param {string} projectDir
 * @param {{ origin?: string, output?: string, programId?: string, laravelGapsReportDirs?: string[] }} [opts]
 */
export async function buildDeliveryDashboard(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const origin = opts.origin ?? "php";
  const output = opts.output ?? "hono";
  const chrysalisDir = join(root, ".chrysalis");

  const evidence = buildHubEvidenceReport(root);
  const verifyGaps = buildProjectVerifyGapsIngestReport(root);

  let assessment = null;
  try {
    assessment = await buildMigrationAssessment({
      projectDir: root,
      origin,
      output,
      laravelGapsReportDirs: opts.laravelGapsReportDirs,
    });
  } catch {
    assessment = null;
  }

  /** @type {string[]} */
  let frameworkHints = assessment?.siteIntelligence?.frameworkHints ?? [];
  const siteIntelArtifact = join(chrysalisDir, "site-intelligence.json");
  if (frameworkHints.length === 0 && existsSync(siteIntelArtifact)) {
    try {
      const si = JSON.parse(readFileSync(siteIntelArtifact, "utf8"));
      if (Array.isArray(si.frameworkHints)) frameworkHints = si.frameworkHints;
    } catch {
      /* ignore */
    }
  }

  let chimera = null;
  try {
    chimera = await buildChimeraCutoverRunbook({
      projectDir: root,
      origin,
      outputs: [output],
      programId: opts.programId ?? assessment?.program?.id ?? "api-slice",
    });
  } catch {
    chimera = null;
  }

  const artifacts = ARTIFACT_FILES.map((name) => {
    const path = name === "migration.cwl" ? join(chrysalisDir, name) : join(chrysalisDir, name);
    const alt = name === "migration.cwl" ? join(root, "migration.cwl") : null;
    const exists = existsSync(path) || (alt ? existsSync(alt) : false);
    return { name, path: existsSync(path) ? path : alt && existsSync(alt) ? alt : path, exists };
  });

  const license = await buildHubLicenseStatusReport();

  const migrationCwl = join(chrysalisDir, "migration.cwl");
  const cwlPath = existsSync(migrationCwl) ? migrationCwl : existsSync(join(root, "migration.cwl")) ? join(root, "migration.cwl") : null;
  let cwlPreview = null;
  const cwlPreviewArtifact = join(chrysalisDir, "cwl-preview.json");
  if (existsSync(cwlPreviewArtifact)) {
    try {
      cwlPreview = JSON.parse(readFileSync(cwlPreviewArtifact, "utf8"));
    } catch {
      cwlPreview = { ok: false, error: "cwl-preview-artifact-invalid" };
    }
  } else if (cwlPath) {
    try {
      cwlPreview = await buildCwlPreviewReport(root, { cwlPath, probe: false });
    } catch {
      cwlPreview = { ok: false, error: "cwl-preview-failed" };
    }
  }

  const isLaravel = frameworkHints.includes("laravel");
  const laravelGapsOpts = opts.laravelGapsReportDirs
    ? { reportDirs: opts.laravelGapsReportDirs, merge: false }
    : {};
  const laravelGlobalGaps = isLaravel ? buildLaravelVerifyGapsReport(laravelGapsOpts) : null;
  const laravelGlobalAction = isLaravel ? runLaravelVerifyGapsAction(laravelGapsOpts) : null;
  const oracleMicro = buildOracleMicroFixtureReport();

  return {
    kind: HUB_DELIVERY_DASHBOARD_KIND,
    schemaVersion: HUB_DELIVERY_DASHBOARD_SCHEMA_VERSION,
    projectDir: root,
    origin,
    output,
    evidence: {
      verifyCorrectness: evidence.verify.correctness,
      verifyGatePass: evidence.verifyGate.pass,
      holeCount: evidence.holes.count,
      deliveryScore: evidence.deliveryScore,
      blockers: evidence.blockers,
      trend: evidence.trend,
    },
    assessment: assessment
      ? {
          readinessTier: assessment.readinessTier,
          nextSteps: assessment.nextSteps,
          routeEstimate: assessment.siteIntelligence?.routeEstimate?.count ?? null,
          programId: assessment.program?.id ?? null,
        }
      : null,
    verifyGaps: {
      available: verifyGaps.ok,
      ingestNext: verifyGaps.ingestNext,
      backlogCount: verifyGaps.backlog.length,
      topBacklog: verifyGaps.backlog.slice(0, 5),
    },
    chimera: chimera
      ? {
          currentPhase: chimera.phases?.find((p) => p.ready === false)?.id ?? chimera.phases?.[chimera.phases.length - 1]?.id ?? null,
          prepGatesPass: chimera.phases?.[0]?.gates?.every((g) => g.pass) ?? null,
          phaseCount: chimera.phases?.length ?? null,
        }
      : null,
    license: {
      requireLicense: license.requireLicense,
      gatePass: license.gatePass,
      tier: license.tier,
      configuredMinTier: license.configuredMinTier,
      hubFeatures: license.hubFeatures,
    },
    cwlPreview: cwlPreview
      ? {
          ok: cwlPreview.ok === true,
          routeCount: cwlPreview.routeCount ?? null,
          holeCount: cwlPreview.holeCount ?? null,
          imports: cwlPreview.imports ?? [],
          moduleName: cwlPreview.moduleName ?? null,
        }
      : null,
    laravelGlobalGaps: laravelGlobalGaps
      ? {
          ok: laravelGlobalGaps.ok === true,
          backlogCount: laravelGlobalGaps.backlog?.length ?? 0,
          ingestNext: laravelGlobalGaps.ingestNext ?? null,
        }
      : null,
    laravelGlobalAction: laravelGlobalAction
      ? {
          ok: laravelGlobalAction.ok === true,
          ingestRemediation: laravelGlobalAction.ingestRemediation,
          suggestedCommand: laravelGlobalAction.ingestRemediation?.suggestedCommand ?? null,
        }
      : null,
    month3Program: {
      oracleMicro: { fixture: oracleMicro.fixture, routeCount: oracleMicro.routeCount },
      cwlRfcSmokes: [
        "hub:cwl-response-status-smoke",
        "hub:cwl-request-body-smoke",
        "hub:cwl-body-roundtrip-smoke",
        "hub:cwl-request-context-smoke",
        "hub:cwl-response-content-type-smoke",
        "hub:cwl-auth-effects-smoke",
        "hub:cwl-rfc-roundtrip-smoke",
      ],
      projectToCwlGates: "hub:project-to-cwl-gates",
      contractCwlSmoke: "hub:contract-cwl-smoke",
      contractRoundtrip: "hub:contract-roundtrip-smoke",
      phpNextjsFlagships: ["hub:php-nextjs-flagship-verify", "hub:php-nextjs-symfony-verify"],
      evidenceSmoke: "hub:evidence-smoke",
      evidenceLive: "hub:evidence-live",
      translateE2e: "hub:translate-e2e-smoke",
      deliveryPipeline: "hub:delivery-pipeline-smoke",
      verifyPlaybooks: "hub:verify-playbooks-smoke",
      hubRunner: "hub:runner-smoke",
      pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
      requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
    },
    month4Program: {
      migrationOsSmoke: "hub:migration-os-smoke",
      cwlPreviewSmoke: "hub:cwl-preview-smoke",
      cwlOpenapiSmoke: "hub:cwl-openapi-smoke",
      pathAdviceSmoke: "hub:path-advice-smoke",
      detectDatabasesSmoke: "hub:detect-databases-smoke",
      cwlMiddlewareSmoke: "hub:cwl-middleware-smoke",
      cwlDiffSmoke: "hub:cwl-diff-smoke",
      cwlAllRfcRoundtrip: "hub:cwl-all-rfc-roundtrip-smoke",
      evidenceTrendSmoke: "hub:evidence-trend-smoke",
      verifyGapsIngestSmoke: "hub:verify-gaps-ingest-smoke",
      requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
    },
    month5Program: {
      cwlPathParamsSmoke: "hub:cwl-path-params-smoke",
      cwlQueryParamsSmoke: "hub:cwl-query-params-smoke",
      cwlMultiGoldSmoke: "hub:cwl-multi-gold-smoke",
      cwlParamsBatchSmoke: "hub:cwl-params-batch-smoke",
      siteIntelligenceSmoke: "hub:site-intelligence-smoke",
      migrationAssessmentSmoke: "hub:migration-assessment-smoke",
      chimeraCutoverSmoke: "hub:chimera-cutover-smoke",
      pathKnowledgeSmoke: "hub:path-knowledge-smoke",
      languageCompareSmoke: "hub:language-compare-smoke",
      migrationOsStandaloneBatch: "hub:migration-os-standalone-batch-smoke",
      migrationOsSymfonySmoke: "hub:migration-os-symfony-smoke",
      runnerBatchSmoke: "hub:runner-batch-smoke",
      deliveryPipelineRunnerSmoke: "hub:delivery-pipeline-runner-smoke",
      evidenceTrendSmoke: "hub:evidence-trend-smoke",
      requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
    },
    month6Program: {
      expressDeliveryBatch: "hub:express-delivery-batch-smoke",
      symfonyMigrationOsBatch: "hub:symfony-migration-os-batch-smoke",
      cwlParamsRoundtripBatch: "hub:cwl-params-roundtrip-batch-smoke",
      cwlMultiBatch: "hub:cwl-multi-batch-smoke",
      cwlInterchangeBatch: "hub:cwl-interchange-batch-smoke",
      evidenceLiveStandaloneBatch: "hub:evidence-live-standalone-batch-smoke",
      translateE2eStandaloneBatch: "hub:translate-e2e-standalone-batch-smoke",
      projectToCwlExpress: "hub:project-to-cwl-express-smoke",
      requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
    },
    month7Program: {
      laravelMinDeliveryBatch: "hub:laravel-min-delivery-batch-smoke",
      plainPhpDeliveryBatch: "hub:plain-php-delivery-batch-smoke",
      threeOriginDeliveryBatch: "hub:three-origin-delivery-batch-smoke",
      laravelDepthBatch: "hub:laravel-depth-batch-smoke",
      cwlFullBatch: "hub:cwl-full-batch-smoke",
      tinyBlogOracleBatch: "hub:tiny-blog-oracle-batch-smoke",
      projectToCwlLaravelMin: "hub:project-to-cwl-laravel-min-smoke",
      requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
    },
    month8Program: {
      fourOriginDeliveryBatch: "hub:four-origin-delivery-batch-smoke",
      symfonyDeliveryBatch: "hub:symfony-delivery-batch-smoke",
      fullDeliveryMegaBatch: "hub:full-delivery-mega-batch-smoke",
      cwlMegaBatch: "hub:cwl-mega-batch-smoke",
      oracleStandaloneBatch: "hub:oracle-standalone-batch-smoke",
      deliveryPipelineStandaloneBatch: "hub:delivery-pipeline-standalone-batch-smoke",
      laravelMinMigrationOsBatch: "hub:laravel-min-migration-os-batch-smoke",
      requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
    },
    month9Program: {
      allDeliveryUltraMegaBatch: "hub:all-delivery-ultra-mega-batch-smoke",
      migrationOsMegaBatch: "hub:migration-os-mega-batch-smoke",
      oracleProductUltraBatch: "hub:oracle-product-ultra-batch-smoke",
      advisoryStandaloneMegaBatch: "hub:advisory-standalone-mega-batch-smoke",
      postTranslateVerifyOriginBatch: "hub:post-translate-verify-origin-batch-smoke",
      tinyBlogDepthBatch: "hub:tiny-blog-depth-batch-smoke",
      requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
    },
    month10Program: {
      originDepthUltraBatch: "hub:origin-depth-ultra-batch-smoke",
      chimeraAssessmentMegaBatch: "hub:chimera-assessment-mega-batch-smoke",
      verifyProductUltraBatch: "hub:verify-product-ultra-batch-smoke",
      chimeraCutoverOriginBatch: "hub:chimera-cutover-origin-batch-smoke",
      requireOriginDepthEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH",
    },
    month11Program: {
      cwlAllOriginsBatch: "hub:cwl-all-origins-batch-smoke",
      cwlUniversalMegaBatch: "hub:cwl-universal-mega-batch-smoke",
      projectToCwlAllOrigins: "hub:project-to-cwl-all-origins",
      requireUniversalCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL",
    },
    month12Program: {
      cwlPatternLiteralCwlBatch: "hub:cwl-pattern-literal-cwl-batch-smoke",
      translateCwlCoverage: "hub:translate-cwl-coverage-smoke",
      requirePatternLiteralCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL",
      requireTranslateCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL",
    },
    month13Program: {
      cwlPatternLiteralRoundtripBatch: "hub:cwl-pattern-literal-roundtrip-batch-smoke",
      requirePatternLiteralRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP",
      requireTranslateCwlAllOriginsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS",
    },
    month14Program: {
      translateCwlRoundtrip: "hub:translate-cwl-roundtrip-smoke",
      cwlFlagshipRoundtripBatch: "hub:cwl-flagship-roundtrip-batch-smoke",
      cwlUniversalMegaBatch: "hub:cwl-universal-mega-batch-smoke",
      requireTranslateCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP",
      requireFlagshipCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP",
    },
    month15Program: {
      projectToCwlRoundtrip: "hub:project-to-cwl-roundtrip-smoke",
      requireProjectToCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP",
    },
    month16Program: {
      contractImportCwlRoundtrip: "hub:contract-import-cwl-roundtrip-smoke",
      requireContractImportCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP",
    },
    month17Program: {
      phpOracleMicroVerify: "hub:php-oracle-micro-verify-batch-smoke",
      requirePhpOracleMicroVerifyEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY",
    },
    month18Program: {
      phpNextjsVerifyBatch: "hub:php-nextjs-verify-batch-smoke",
      requirePhpNextjsVerifyBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH",
      requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
    },
    month19Program: {
      phpWedgeBatch: "hub:php-wedge-batch-smoke",
      laravelVerifyGapsBatch: "hub:laravel-verify-gaps-batch-smoke",
      requirePhpWedgeBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH",
    },
    month20Program: {
      hubEvidenceMvpBatch: "hub:evidence-mvp-batch-smoke",
      requireHubEvidenceMvpBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH",
    },
    month21Program: {
      wptpStrictBatch: "hub:wptp-strict-batch-smoke",
      requireWptpStrictBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH",
      requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
    },
    month22Program: {
      flagshipFullGapsBatch: "hub:flagship-full-gaps-batch-smoke",
      requireFlagshipFullGapsBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH",
    },
    month23Program: {
      gapsIngestClosureBatch: "hub:gaps-ingest-closure-batch-smoke",
      expressVerifySeed: "hub:express-flagship-verify-seed",
      laravelVerifyGapsIngestClosure: "hub:laravel-verify-gaps-ingest-closure-smoke",
      gapReingestBatch: "hub:gap-reingest-batch-smoke",
      requireGapsIngestClosureBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
      requireGapReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST",
    },
    month24Program: {
      gapsIngestStrictBatch: "hub:gaps-ingest-strict-batch-smoke",
      laravelVerifyLiveGapsClosure: "hub:laravel-verify-live-gaps-closure-smoke",
      gapReingestStrict: "hub:gap-reingest-strict-smoke",
      requireGapsIngestClosureBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
      requireGapReingestStrictEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
    },
    month25Program: {
      laravelAuthProbeReingest: "hub:laravel-auth-probe-reingest-smoke",
      gapReingestBatchSchemaVersion: 3,
      requireGapReingestStrictEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
    },
    month26Program: {
      laravelAuthProbeVerifySeed: "hub:laravel-auth-probe-verify-seed",
      laravelAuthProbeVerifyClosure: "hub:laravel-auth-probe-reingest-verify-closure-smoke",
      requireGapReingestVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
    },
    month27Program: {
      laravelAuthProbeVerifyReplay: "hub:laravel-auth-probe-reingest-verify-replay-smoke",
      flagshipVerifyReplay: "hub:flagship-verify-replay-batch-smoke",
      irHelperLifting: "hub:ir-helper-lifting-smoke",
      requireGapReingestVerifyReplayEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY",
    },
    month28Program: {
      laravelAuthProbeVerifyHttp: "hub:laravel-auth-probe-reingest-verify-http-smoke",
      flagshipVerifyHttp: "hub:flagship-verify-http-batch-smoke",
      irHelperLiftingSemantic: "hub:ir-helper-lifting-semantic-smoke",
      requireGapReingestVerifyHttpEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP",
    },
    artifacts,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = "php";
  let output = "hono";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
  }
  if (!projectDir) {
    throw new Error("usage: hub-delivery-dashboard.mjs --project <dir> [--origin php] [--output hono]");
  }
  return { projectDir, origin, output };
}

async function main() {
  const { projectDir, origin, output } = parseArgs(process.argv);
  const report = await buildDeliveryDashboard(projectDir, { origin, output });
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
