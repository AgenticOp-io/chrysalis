#!/usr/bin/env node
/**
 * Hub matrix completion gate: matrix smoke + gold verify + route grade summary.
 * Usage: node scripts/hub-ingest/hub-completion.mjs [--json-out reports/ci/hub-completion.json]
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } from "../chrysalis-hub-store.mjs";
import { buildHubGoldCoverageReport } from "./hub-gold-coverage.mjs";
import { buildHubCompletionSections } from "./hub-completion-sections.mjs";
import { buildHubCapabilityMatrixReport } from "./hub-capability-matrix.mjs";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";
import { buildHubLaravelMinSmokeReport } from "./hub-laravel-min-smoke.mjs";
import { runPhpNextjsVerify, runPhpNextjsFlagshipVerify, runPhpNextjsSymfonyFlagshipVerify } from "./hub-php-nextjs-verify.mjs";
import { runNodeExpressOracleVerify } from "./hub-node-express-oracle-verify.mjs";
import { buildWebDatabaseCatalogReport } from "./hub-web-databases.mjs";
import { hubGoldStructuralSuiteIds, hubGoldTraceReplaySuiteIds } from "./hub-gold-manifest.mjs";
import { hubNativeEmitTargetIds } from "./hub-gold-native-emit.mjs";
import { resolveHubPython } from "./shared.mjs";
import { buildHubLicenseStatusReport } from "./hub-license-status.mjs";
import { buildOracleMicroFixtureReport } from "./hub-php-oracle-micro-fixture.mjs";
import { runCwlResponseStatusSmoke } from "./hub-cwl-response-status-smoke.mjs";
import { runCwlRequestBodySmoke } from "./hub-cwl-request-body-smoke.mjs";
import { runProjectToCwlOracleGates } from "./hub-project-to-cwl-gates.mjs";
import { exportHubLaravelVerifyLive } from "./hub-laravel-verify-export.mjs";
import { runHubEvidenceSmoke } from "./hub-evidence-smoke.mjs";
import { runContractCwlSmoke } from "./hub-contract-cwl-smoke.mjs";
import { runHubTranslateE2eSmoke, runHubTranslateE2eBatch } from "./hub-translate-e2e-smoke.mjs";
import { runCwlBodyRoundtripSmoke } from "./hub-cwl-body-roundtrip-smoke.mjs";
import { runCwlRequestContextSmoke } from "./hub-cwl-request-context-smoke.mjs";
import { runCwlResponseContentTypeSmoke } from "./hub-cwl-response-content-type-smoke.mjs";
import { runCwlAuthEffectsSmoke } from "./hub-cwl-auth-effects-smoke.mjs";
import {
  runCwlRequestContextRoundtripSmoke,
  runCwlResponseContentTypeRoundtripSmoke,
  runCwlAuthEffectsRoundtripSmoke,
} from "./hub-cwl-rfc-roundtrip-smoke.mjs";
import { runContractRoundtripSmoke } from "./hub-contract-roundtrip-smoke.mjs";
import { runHubEvidenceLive, runHubEvidenceLiveBatch } from "./hub-evidence-live.mjs";
import { runDeliveryPipelineSmoke, runDeliveryPipelineBatch } from "./hub-delivery-pipeline-smoke.mjs";
import { runVerifyPlaybooksSmoke } from "./hub-verify-playbooks-smoke.mjs";
import { runPostTranslateVerifySmoke } from "./hub-post-translate-verify-smoke.mjs";
import { runHubRunnerSmoke } from "./hub-runner-smoke.mjs";
import { runMigrationOsSmoke } from "./hub-migration-os-smoke.mjs";
import { runCwlPreviewSmoke } from "./hub-cwl-preview-smoke.mjs";
import { runCwlOpenapiSmoke } from "./hub-cwl-openapi-smoke.mjs";
import { runPathAdviceSmoke } from "./hub-path-advice-smoke.mjs";
import { runDetectDatabasesSmoke } from "./hub-detect-databases-smoke.mjs";
import { runPostTranslateArtifactsSmoke } from "./hub-post-translate-artifacts-smoke.mjs";
import { runCwlMiddlewareSmoke } from "./hub-cwl-middleware-smoke.mjs";
import { runCwlDiffSmoke } from "./hub-cwl-diff-smoke.mjs";
import { runCwlAllRfcRoundtripSmoke } from "./hub-cwl-all-rfc-roundtrip-smoke.mjs";
import { runWptpGoldSmoke } from "./hub-wptp-gold-smoke.mjs";
import { runMultiLaneSmoke } from "./hub-multi-lane-smoke.mjs";
import { runEvidenceTrendSmoke } from "./hub-evidence-trend-smoke.mjs";
import { runVerifyGapsIngestSmoke } from "./hub-verify-gaps-ingest-smoke.mjs";
import { runPlainPhpFlagshipSmoke } from "./hub-plain-php-flagship.mjs";
import { runSymfonyFlagshipSmoke } from "./hub-symfony-flagship.mjs";
import { runCwlPathParamsSmoke } from "./hub-cwl-path-params-smoke.mjs";
import { runCwlQueryParamsSmoke } from "./hub-cwl-query-params-smoke.mjs";
import { runCwlMultiGoldSmoke } from "./hub-cwl-multi-gold-smoke.mjs";
import { runCwlMultiRoundtripSmoke } from "./hub-cwl-multi-roundtrip-smoke.mjs";
import { runCwlParamsBatchSmoke } from "./hub-cwl-params-batch-smoke.mjs";
import { runSiteIntelligenceSmoke } from "./hub-site-intelligence-smoke.mjs";
import { runMigrationAssessmentSmoke } from "./hub-migration-assessment-smoke.mjs";
import { runChimeraCutoverSmoke } from "./hub-chimera-cutover-smoke.mjs";
import { runPathKnowledgeSmoke } from "./hub-path-knowledge-smoke.mjs";
import { runLanguageCompareSmoke } from "./hub-language-compare-smoke.mjs";
import { runMigrationOsSymfonySmoke } from "./hub-migration-os-symfony-smoke.mjs";
import { runMigrationOsStandaloneBatchSmoke } from "./hub-migration-os-standalone-batch-smoke.mjs";
import { runVerifyGapsSymfonySmoke } from "./hub-verify-gaps-symfony-smoke.mjs";
import { runHubRunnerBatchSmoke } from "./hub-runner-batch-smoke.mjs";
import { runDeliveryPipelineRunnerSmoke } from "./hub-delivery-pipeline-runner-smoke.mjs";
import { runPathAdviceSymfonySmoke } from "./hub-path-advice-symfony-smoke.mjs";
import { runSiteIntelligenceSymfonySmoke } from "./hub-site-intelligence-symfony-smoke.mjs";
import { runPostTranslateArtifactsSymfonySmoke } from "./hub-post-translate-artifacts-symfony-smoke.mjs";
import { runExpressFlagshipSmoke } from "./hub-express-flagship.mjs";
import { runSiteIntelligenceExpressSmoke } from "./hub-site-intelligence-express-smoke.mjs";
import { runPathAdviceExpressSmoke } from "./hub-path-advice-express-smoke.mjs";
import { runVerifyGapsExpressSmoke } from "./hub-verify-gaps-express-smoke.mjs";
import { runPostTranslateArtifactsExpressSmoke } from "./hub-post-translate-artifacts-express-smoke.mjs";
import { runMigrationAssessmentSymfonySmoke } from "./hub-migration-assessment-symfony-smoke.mjs";
import { runChimeraCutoverSymfonySmoke } from "./hub-chimera-cutover-symfony-smoke.mjs";
import { runMigrationAssessmentExpressSmoke } from "./hub-migration-assessment-express-smoke.mjs";
import { runChimeraCutoverExpressSmoke } from "./hub-chimera-cutover-express-smoke.mjs";
import { runCwlParamsRoundtripBatchSmoke } from "./hub-cwl-params-roundtrip-batch-smoke.mjs";
import { runCwlMultiBatchSmoke } from "./hub-cwl-multi-batch-smoke.mjs";
import { runCwlInterchangeBatchSmoke } from "./hub-cwl-interchange-batch-smoke.mjs";
import { runEvidenceLiveStandaloneBatchSmoke } from "./hub-evidence-live-standalone-batch-smoke.mjs";
import { runTranslateE2eStandaloneBatchSmoke } from "./hub-translate-e2e-standalone-batch-smoke.mjs";
import { runExpressDeliveryBatchSmoke } from "./hub-express-delivery-batch-smoke.mjs";
import { runSymfonyMigrationOsBatchSmoke } from "./hub-symfony-migration-os-batch-smoke.mjs";
import { runProjectToCwlExpressSmoke } from "./hub-project-to-cwl-express-smoke.mjs";
import { runSiteIntelligenceLaravelMinSmoke } from "./hub-site-intelligence-laravel-min-smoke.mjs";
import { runPathAdviceLaravelMinSmoke } from "./hub-path-advice-laravel-min-smoke.mjs";
import { runMigrationAssessmentLaravelMinSmoke } from "./hub-migration-assessment-laravel-min-smoke.mjs";
import { runChimeraCutoverLaravelMinSmoke } from "./hub-chimera-cutover-laravel-min-smoke.mjs";
import { runPostTranslateArtifactsLaravelMinSmoke } from "./hub-post-translate-artifacts-laravel-min-smoke.mjs";
import { runProjectToCwlLaravelMinSmoke } from "./hub-project-to-cwl-laravel-min-smoke.mjs";
import { runLaravelMinDeliveryBatchSmoke } from "./hub-laravel-min-delivery-batch-smoke.mjs";
import { runPlainPhpDeliveryBatchSmoke } from "./hub-plain-php-delivery-batch-smoke.mjs";
import { runThreeOriginDeliveryBatchSmoke } from "./hub-three-origin-delivery-batch-smoke.mjs";
import { runLaravelDepthBatchSmoke } from "./hub-laravel-depth-batch-smoke.mjs";
import { runCwlFullBatchSmoke } from "./hub-cwl-full-batch-smoke.mjs";
import { runVerifyGapsLaravelMinSmoke } from "./hub-verify-gaps-laravel-min-smoke.mjs";
import { runTinyBlogOracleBatchSmoke } from "./hub-tiny-blog-oracle-batch-smoke.mjs";
import { runFourOriginDeliveryBatchSmoke } from "./hub-four-origin-delivery-batch-smoke.mjs";
import { runSymfonyDeliveryBatchSmoke } from "./hub-symfony-delivery-batch-smoke.mjs";
import { runLaravelMinMigrationOsBatchSmoke } from "./hub-laravel-min-migration-os-batch-smoke.mjs";
import { runOracleStandaloneBatchSmoke } from "./hub-oracle-standalone-batch-smoke.mjs";
import { runFullDeliveryMegaBatchSmoke } from "./hub-full-delivery-mega-batch-smoke.mjs";
import { runCwlMegaBatchSmoke } from "./hub-cwl-mega-batch-smoke.mjs";
import { runCwlAuthoringBatchV2Smoke } from "./hub-cwl-authoring-batch-v2-smoke.mjs";
import { runCwlAuthoringBatchV3Smoke } from "./hub-cwl-authoring-batch-v3-smoke.mjs";
import { runPlainPhpMigrationOsBatchSmoke } from "./hub-plain-php-migration-os-batch-smoke.mjs";
import { runTinyBlogDeliveryBatchSmoke } from "./hub-tiny-blog-delivery-batch-smoke.mjs";
import { runDeliveryPipelineStandaloneBatchSmoke } from "./hub-delivery-pipeline-standalone-batch-smoke.mjs";
import { runLaravelMinOracleBatchSmoke } from "./hub-laravel-min-oracle-batch-smoke.mjs";
import { runAdvisoryStandaloneMegaBatchSmoke } from "./hub-advisory-standalone-mega-batch-smoke.mjs";
import { runAllDeliveryUltraMegaBatchSmoke } from "./hub-all-delivery-ultra-mega-batch-smoke.mjs";
import { runMigrationOsMegaBatchSmoke } from "./hub-migration-os-mega-batch-smoke.mjs";
import { runOracleProductUltraBatchSmoke } from "./hub-oracle-product-ultra-batch-smoke.mjs";
import { runExpressLaravelMinDeliveryBatchSmoke } from "./hub-express-laravel-min-delivery-batch-smoke.mjs";
import { runSymfonyLaravelMinDeliveryBatchSmoke } from "./hub-symfony-laravel-min-delivery-batch-smoke.mjs";
import { runPostTranslateVerifyOriginBatchSmoke } from "./hub-post-translate-verify-origin-batch-smoke.mjs";
import { runTinyBlogDepthBatchSmoke } from "./hub-tiny-blog-depth-batch-smoke.mjs";
import { runContractVerifyStandaloneBatchSmoke } from "./hub-contract-verify-standalone-batch-smoke.mjs";
import { runChimeraCutoverOriginBatchSmoke } from "./hub-chimera-cutover-origin-batch-smoke.mjs";
import { runMigrationAssessmentOriginBatchSmoke } from "./hub-migration-assessment-origin-batch-smoke.mjs";
import { runVerifyGapsOriginBatchSmoke } from "./hub-verify-gaps-origin-batch-smoke.mjs";
import { runPostTranslateArtifactsOriginBatchSmoke } from "./hub-post-translate-artifacts-origin-batch-smoke.mjs";
import { runVerifyStandaloneMegaBatchSmoke } from "./hub-verify-standalone-mega-batch-smoke.mjs";
import { runContractStandaloneMegaBatchSmoke } from "./hub-contract-standalone-mega-batch-smoke.mjs";
import { runEvidenceStandaloneMegaBatchSmoke } from "./hub-evidence-standalone-mega-batch-smoke.mjs";
import { runPlainPhpDepthBatchSmoke } from "./hub-plain-php-depth-batch-smoke.mjs";
import { runSymfonyDepthBatchSmoke } from "./hub-symfony-depth-batch-smoke.mjs";
import { runExpressDepthBatchSmoke } from "./hub-express-depth-batch-smoke.mjs";
import { runLaravelMinDepthBatchSmoke } from "./hub-laravel-min-depth-batch-smoke.mjs";
import { runOriginDepthUltraBatchSmoke } from "./hub-origin-depth-ultra-batch-smoke.mjs";
import { runChimeraAssessmentMegaBatchSmoke } from "./hub-chimera-assessment-mega-batch-smoke.mjs";
import { runVerifyProductUltraBatchSmoke } from "./hub-verify-product-ultra-batch-smoke.mjs";
import { runProjectToCwlAllOrigins } from "./hub-project-to-cwl-all-origins.mjs";
import { runCwlAllOriginsBatchSmoke } from "./hub-cwl-all-origins-batch-smoke.mjs";
import { runCwlUniversalMegaBatchSmoke } from "./hub-cwl-universal-mega-batch-smoke.mjs";
import { runCwlAppStackOriginsBatchSmoke } from "./hub-cwl-app-stack-origins-batch-smoke.mjs";
import { runCwlAssetOriginsBatchSmoke } from "./hub-cwl-asset-origins-batch-smoke.mjs";
import { runCwlPatternLiteralCwlBatchSmoke } from "./hub-cwl-pattern-literal-cwl-batch-smoke.mjs";
import { runHubTranslateCwlCoverageSmoke } from "./hub-translate-cwl-coverage-smoke.mjs";
import { runCwlPatternLiteralRoundtripBatchSmoke } from "./hub-cwl-pattern-literal-roundtrip-batch-smoke.mjs";
import { runCwlFlagshipRoundtripBatchSmoke } from "./hub-cwl-flagship-roundtrip-batch-smoke.mjs";
import { runHubTranslateCwlRoundtripSmoke } from "./hub-translate-cwl-roundtrip-smoke.mjs";
import { runProjectToCwlRoundtripSmoke } from "./hub-project-to-cwl-roundtrip-smoke.mjs";
import { runContractImportCwlRoundtripSmoke } from "./hub-contract-import-cwl-roundtrip-smoke.mjs";
import { runPhpOracleMicroVerifyBatchSmoke } from "./hub-php-oracle-micro-verify-batch-smoke.mjs";
import { runPhpNextjsVerifyBatchSmoke } from "./hub-php-nextjs-verify-batch-smoke.mjs";
import { runPhpWedgeBatchSmoke } from "./hub-php-wedge-batch-smoke.mjs";
import { runHubEvidenceMvpBatchSmoke } from "./hub-evidence-mvp-batch-smoke.mjs";
import { runWptpStrictBatchSmoke } from "./hub-wptp-strict-batch-smoke.mjs";
import { runFlagshipFullGapsBatchSmoke } from "./hub-flagship-full-gaps-batch-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runGapsIngestStrictBatchSmoke } from "./hub-gaps-ingest-strict-batch-smoke.mjs";
import { runLaravelAuthProbeReingestSmoke } from "./hub-laravel-auth-probe-reingest-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";
import { runFlagshipVerifyReplayBatchSmoke } from "./hub-flagship-verify-replay-batch-smoke.mjs";
import { runIrHelperLiftingSmoke } from "./hub-ir-helper-lifting-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpSmoke } from "./hub-laravel-auth-probe-reingest-verify-http-smoke.mjs";
import { runFlagshipVerifyHttpBatchSmoke } from "./hub-flagship-verify-http-batch-smoke.mjs";
import { runIrHelperLiftingSemanticSmoke } from "./hub-ir-helper-lifting-semantic-smoke.mjs";
import { runIrHelperLiftingEmbedSmoke } from "./hub-ir-helper-lifting-embed-smoke.mjs";
import { runLaravelAuthProbeVerifyHttpFastify } from "./hub-laravel-auth-probe-verify-http-fastify.mjs";
import { runFlagshipVerifyHttpFastifyBatchSmoke } from "./hub-flagship-verify-http-fastify-batch-smoke.mjs";
import { runIrHelperLiftingFullPathSmoke } from "./hub-ir-helper-lifting-full-path-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpFastifySmoke } from "./hub-laravel-auth-probe-reingest-verify-http-fastify-smoke.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  let jsonOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
  }
  return { jsonOut };
}

function parseStdoutJson(stdout) {
  const text = stdout.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("no JSON object in subprocess stdout");
  }
}

function runJson(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let parsed = {};
  try {
    parsed = parseStdoutJson(r.stdout);
  } catch {
    parsed = {};
  }
  return { status: r.status ?? 1, parsed, stderr: r.stderr };
}

function summarizeRouteGrades() {
  const counts = { gold: 0, silver: 0, open: 0 };
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const g = HUB_ROUTES[`${src.id}:${out.id}`]?.grade ?? "open";
      if (g === "gold") counts.gold += 1;
      else if (g === "silver") counts.silver += 1;
      else counts.open += 1;
    }
  }
  return counts;
}

async function main() {
  const { jsonOut } = parseArgs(process.argv);
  const matrix = runJson(join(scriptRoot, "scripts/hub-ingest/hub-matrix-smoke.mjs"), []);
  const gold = runJson(join(scriptRoot, "scripts/hub-ingest/hub-gold-verify.mjs"), []);
  const traceReplay = spawnSync(
    process.execPath,
    ["--import", "tsx", join(scriptRoot, "scripts/hub-ingest/hub-gold-trace-replay.mjs")],
    { cwd: scriptRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  let traceParsed = {};
  try {
    traceParsed = parseStdoutJson(traceReplay.stdout);
  } catch {
    traceParsed = {};
  }
  const nativeEmit = runJson(join(scriptRoot, "scripts/hub-ingest/hub-native-emit-smoke.mjs"), []);
  const synthesis = runJson(join(scriptRoot, "scripts/hub-ingest/hub-cross-language-synthesis.mjs"), []);
  const oraclePy = spawnSync(resolveHubPython(), [
    join(scriptRoot, "packages/oracle-python/record_smoke.py"),
    join(scriptRoot, "reports/ci/hub-oracle-python-smoke.ndjson"),
  ], { cwd: scriptRoot, encoding: "utf8" });
  const oracleNode = spawnSync(process.execPath, [
    join(scriptRoot, "packages/oracle-node/record-smoke.mjs"),
    join(scriptRoot, "reports/ci/hub-oracle-node-smoke.ndjson"),
  ], { cwd: scriptRoot, encoding: "utf8" });

  const routeGrades = summarizeRouteGrades();
  const synthesisOk =
    synthesis.status === 0 &&
    synthesis.parsed.kind === "chrysalis.hub.cross-language-synthesis" &&
    synthesis.parsed.universe?.pairCount === 575 &&
    (synthesis.parsed.gradeSummary?.gold ?? 0) >= routeGrades.gold;

  const structuralSuiteIds = hubGoldStructuralSuiteIds();
  const traceSuiteIds = hubGoldTraceReplaySuiteIds();
  const goldSuiteCountOk =
    gold.parsed.ok === true && (gold.parsed.suiteCount ?? 0) === structuralSuiteIds.length;
  const traceSuiteCountOk =
    traceParsed.ok === true && (traceParsed.suiteCount ?? 0) === traceSuiteIds.length;
  const goldCoverage = buildHubGoldCoverageReport();
  const goldCoverageOk = goldCoverage.summary.coverageGaps === 0;
  const multiLaneReport = runMultiLaneSmoke();
  const multiLaneOk = multiLaneReport.ok === true;
  const phpOracle = runJson(join(scriptRoot, "scripts/hub-ingest/hub-php-oracle-smoke.mjs"), []);
  const phpOracleOk = phpOracle.status === 0 && phpOracle.parsed.ok === true;
  const laravelGaps = buildLaravelVerifyGapsReport();
  const laravelGapsAction = runLaravelVerifyGapsAction();
  const laravelMinSmoke = buildHubLaravelMinSmokeReport();
  const laravelMinSmokeOk = laravelMinSmoke.ok === true;
  let expressFlagshipReport = { ok: false, skip: "not-run-in-completion" };
  try {
    expressFlagshipReport = await runExpressFlagshipSmoke();
  } catch {
    expressFlagshipReport = { ok: false, skip: "express-flagship-threw" };
  }
  const expressFlagshipOk = expressFlagshipReport.ok === true;
  let plainPhpFlagshipReport = { ok: false, skip: "not-run-in-completion" };
  try {
    plainPhpFlagshipReport = await runPlainPhpFlagshipSmoke();
  } catch {
    plainPhpFlagshipReport = { ok: false, skip: "plain-php-flagship-threw" };
  }
  const plainPhpFlagshipOk = plainPhpFlagshipReport.ok === true;
  let symfonyFlagshipReport = { ok: false, skip: "not-run-in-completion" };
  try {
    symfonyFlagshipReport = await runSymfonyFlagshipSmoke();
  } catch {
    symfonyFlagshipReport = { ok: false, skip: "symfony-flagship-threw" };
  }
  const symfonyFlagshipOk = symfonyFlagshipReport.ok === true;
  let nodeExpressOracle = { ok: true, skip: "not-run-in-completion" };
  try {
    nodeExpressOracle = await runNodeExpressOracleVerify();
  } catch {
    nodeExpressOracle = { ok: false, skip: "node-express-oracle-threw" };
  }
  const nodeExpressOracleOk = nodeExpressOracle.ok === true;
  let phpNextjsVerify = { ok: true, skip: "not-run-in-completion" };
  try {
    phpNextjsVerify = await runPhpNextjsVerify(join(scriptRoot, "fixtures/tiny-blog"));
  } catch {
    phpNextjsVerify = { ok: false, skip: "nextjs-verify-threw" };
  }
  const phpNextjsVerifyOk =
    phpNextjsVerify.ok === true || phpNextjsVerify.skip === "no-wptp-emit-nextjs";
  let phpNextjsFlagshipVerify = { ok: true, skip: "not-run-in-completion" };
  try {
    phpNextjsFlagshipVerify = await runPhpNextjsFlagshipVerify();
  } catch {
    phpNextjsFlagshipVerify = { ok: false, skip: "nextjs-flagship-verify-threw" };
  }
  const phpNextjsFlagshipVerifyOk =
    phpNextjsFlagshipVerify.ok === true || phpNextjsFlagshipVerify.skip === "no-wptp-emit-nextjs";
  let phpNextjsSymfonyVerify = { ok: true, skip: "not-run-in-completion" };
  try {
    phpNextjsSymfonyVerify = await runPhpNextjsSymfonyFlagshipVerify();
  } catch {
    phpNextjsSymfonyVerify = { ok: false, skip: "nextjs-symfony-verify-threw" };
  }
  const phpNextjsSymfonyVerifyOk =
    phpNextjsSymfonyVerify.ok === true || phpNextjsSymfonyVerify.skip === "no-wptp-emit-nextjs";
  const oracleMicro = buildOracleMicroFixtureReport();
  let cwlResponseStatusRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlResponseStatusRuntime = await runCwlResponseStatusSmoke();
  } catch {
    cwlResponseStatusRuntime = { ok: false, skip: "cwl-response-status-smoke-threw" };
  }
  const cwlResponseStatusRuntimeOk = cwlResponseStatusRuntime.ok === true;
  let cwlRequestBodyRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlRequestBodyRuntime = await runCwlRequestBodySmoke();
  } catch {
    cwlRequestBodyRuntime = { ok: false, skip: "cwl-request-body-smoke-threw" };
  }
  const cwlRequestBodyRuntimeOk = cwlRequestBodyRuntime.ok === true;
  let projectToCwlExport = { ok: false, skip: "not-run-in-completion" };
  try {
    projectToCwlExport = await runProjectToCwlOracleGates();
  } catch {
    projectToCwlExport = { ok: false, skip: "project-to-cwl-gates-threw" };
  }
  const projectToCwlExportOk = projectToCwlExport.ok === true;
  let hubEvidenceSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    hubEvidenceSmoke = await runHubEvidenceSmoke();
  } catch {
    hubEvidenceSmoke = { ok: false, skip: "evidence-smoke-threw" };
  }
  const hubEvidenceSmokeOk = hubEvidenceSmoke.ok === true;
  let contractCwlSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    contractCwlSmoke = await runContractCwlSmoke();
  } catch {
    contractCwlSmoke = { ok: false, skip: "contract-cwl-smoke-threw" };
  }
  const contractCwlSmokeOk = contractCwlSmoke.ok === true;
  const nodeOracleSpike = runJson(join(scriptRoot, "scripts/hub-ingest/hub-node-oracle-spike.mjs"), []);
  const nodeOracleSpikeOk = nodeOracleSpike.status === 0 && nodeOracleSpike.parsed.ok === true;
  let hubTranslateE2e = { ok: false, skip: "not-run-in-completion" };
  try {
    hubTranslateE2e = runHubTranslateE2eBatch(["plainPhp", "symfony", "tinyBlog", "express"]);
  } catch {
    hubTranslateE2e = { ok: false, skip: "translate-e2e-threw" };
  }
  const hubTranslateE2eOk =
    hubTranslateE2e.ok === true ||
    (hubTranslateE2e.results?.plainPhp?.skip === "missing-cli-dist" &&
      hubTranslateE2e.results?.symfony?.skip === "missing-cli-dist");
  let cwlBodyRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlBodyRoundtrip = await runCwlBodyRoundtripSmoke();
  } catch {
    cwlBodyRoundtrip = { ok: false, skip: "cwl-body-roundtrip-threw" };
  }
  const cwlBodyRoundtripOk = cwlBodyRoundtrip.ok === true;
  let cwlRequestContextRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlRequestContextRuntime = await runCwlRequestContextSmoke();
  } catch {
    cwlRequestContextRuntime = { ok: false, skip: "cwl-request-context-smoke-threw" };
  }
  const cwlRequestContextRuntimeOk = cwlRequestContextRuntime.ok === true;
  let cwlResponseContentTypeRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlResponseContentTypeRuntime = await runCwlResponseContentTypeSmoke();
  } catch {
    cwlResponseContentTypeRuntime = { ok: false, skip: "cwl-content-type-smoke-threw" };
  }
  const cwlResponseContentTypeRuntimeOk = cwlResponseContentTypeRuntime.ok === true;
  let cwlAuthEffectsRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlAuthEffectsRuntime = await runCwlAuthEffectsSmoke();
  } catch {
    cwlAuthEffectsRuntime = { ok: false, skip: "cwl-auth-effects-smoke-threw" };
  }
  const cwlAuthEffectsRuntimeOk = cwlAuthEffectsRuntime.ok === true;
  let cwlRfcRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    const ctx = await runCwlRequestContextRoundtripSmoke();
    const ct = await runCwlResponseContentTypeRoundtripSmoke();
    const auth = await runCwlAuthEffectsRoundtripSmoke();
    cwlRfcRoundtrip = { ok: ctx.ok && ct.ok && auth.ok, requestContext: ctx, contentType: ct, authEffects: auth };
  } catch {
    cwlRfcRoundtrip = { ok: false, skip: "cwl-rfc-roundtrip-threw" };
  }
  const cwlRfcRoundtripOk = cwlRfcRoundtrip.ok === true;
  let contractRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    contractRoundtrip = await runContractRoundtripSmoke();
  } catch {
    contractRoundtrip = { ok: false, skip: "contract-roundtrip-threw" };
  }
  const contractRoundtripOk = contractRoundtrip.ok === true;
  let hubEvidenceLive = { ok: false, skip: "not-run-in-completion" };
  try {
    hubEvidenceLive = await runHubEvidenceLiveBatch(["plainPhp", "symfony", "tinyBlog", "express"]);
  } catch {
    hubEvidenceLive = { ok: false, skip: "evidence-live-threw" };
  }
  const hubEvidenceLiveOk = hubEvidenceLive.ok === true;
  let deliveryPipelineSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    deliveryPipelineSmoke = await runDeliveryPipelineBatch(["plainPhp", "symfony", "express"]);
  } catch {
    deliveryPipelineSmoke = { ok: false, skip: "delivery-pipeline-threw" };
  }
  const deliveryPipelineSmokeOk = deliveryPipelineSmoke.ok === true;
  const verifyPlaybooksSmoke = runVerifyPlaybooksSmoke();
  const verifyPlaybooksSmokeOk = verifyPlaybooksSmoke.ok === true;
  let postTranslateVerifySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateVerifySmoke = await runPostTranslateVerifySmoke();
  } catch {
    postTranslateVerifySmoke = { ok: false, skip: "post-translate-verify-threw" };
  }
  const postTranslateVerifySmokeOk = postTranslateVerifySmoke.ok === true;
  const hubRunnerSmoke = runHubRunnerSmoke();
  const hubRunnerSmokeOk = hubRunnerSmoke.ok === true;
  let migrationOsSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationOsSmoke = await runMigrationOsSmoke();
  } catch {
    migrationOsSmoke = { ok: false, skip: "migration-os-threw" };
  }
  const migrationOsSmokeOk = migrationOsSmoke.ok === true;
  let cwlPreviewSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlPreviewSmoke = await runCwlPreviewSmoke();
  } catch {
    cwlPreviewSmoke = { ok: false, skip: "cwl-preview-threw" };
  }
  const cwlPreviewSmokeOk = cwlPreviewSmoke.ok === true;
  let cwlOpenapiSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlOpenapiSmoke = await runCwlOpenapiSmoke();
  } catch {
    cwlOpenapiSmoke = { ok: false, skip: "cwl-openapi-threw" };
  }
  const cwlOpenapiSmokeOk = cwlOpenapiSmoke.ok === true;
  let pathAdviceSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    pathAdviceSmoke = await runPathAdviceSmoke();
  } catch {
    pathAdviceSmoke = { ok: false, skip: "path-advice-threw" };
  }
  const pathAdviceSmokeOk = pathAdviceSmoke.ok === true;
  let detectDatabasesSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    detectDatabasesSmoke = runDetectDatabasesSmoke();
  } catch {
    detectDatabasesSmoke = { ok: false, skip: "detect-databases-threw" };
  }
  const detectDatabasesSmokeOk = detectDatabasesSmoke.ok === true;
  let postTranslateArtifactsSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateArtifactsSmoke = await runPostTranslateArtifactsSmoke();
  } catch {
    postTranslateArtifactsSmoke = { ok: false, skip: "post-translate-artifacts-threw" };
  }
  const postTranslateArtifactsSmokeOk = postTranslateArtifactsSmoke.ok === true;
  let cwlMiddlewareSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlMiddlewareSmoke = await runCwlMiddlewareSmoke();
  } catch {
    cwlMiddlewareSmoke = { ok: false, skip: "cwl-middleware-threw" };
  }
  const cwlMiddlewareSmokeOk = cwlMiddlewareSmoke.ok === true;
  let cwlDiffSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlDiffSmoke = runCwlDiffSmoke();
  } catch {
    cwlDiffSmoke = { ok: false, skip: "cwl-diff-threw" };
  }
  const cwlDiffSmokeOk = cwlDiffSmoke.ok === true;
  let cwlAllRfcRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlAllRfcRoundtrip = await runCwlAllRfcRoundtripSmoke();
  } catch {
    cwlAllRfcRoundtrip = { ok: false, skip: "cwl-all-rfc-roundtrip-threw" };
  }
  const cwlAllRfcRoundtripOk = cwlAllRfcRoundtrip.ok === true;
  const wptpGoldSmoke = runWptpGoldSmoke();
  const wptpGoldSmokeOk = wptpGoldSmoke.ok === true || wptpGoldSmoke.skip != null;
  let evidenceTrendSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    evidenceTrendSmoke = runEvidenceTrendSmoke();
  } catch {
    evidenceTrendSmoke = { ok: false, skip: "evidence-trend-threw" };
  }
  const evidenceTrendSmokeOk = evidenceTrendSmoke.ok === true;
  let verifyGapsIngestSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyGapsIngestSmoke = runVerifyGapsIngestSmoke();
  } catch {
    verifyGapsIngestSmoke = { ok: false, skip: "verify-gaps-ingest-threw" };
  }
  const verifyGapsIngestSmokeOk = verifyGapsIngestSmoke.ok === true;
  let cwlPathParamsRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlPathParamsRuntime = await runCwlPathParamsSmoke();
  } catch {
    cwlPathParamsRuntime = { ok: false, skip: "cwl-path-params-threw" };
  }
  const cwlPathParamsRuntimeOk = cwlPathParamsRuntime.ok === true;
  let cwlQueryParamsRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlQueryParamsRuntime = await runCwlQueryParamsSmoke();
  } catch {
    cwlQueryParamsRuntime = { ok: false, skip: "cwl-query-params-threw" };
  }
  const cwlQueryParamsRuntimeOk = cwlQueryParamsRuntime.ok === true;
  let cwlMultiGoldRuntime = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlMultiGoldRuntime = await runCwlMultiGoldSmoke();
  } catch {
    cwlMultiGoldRuntime = { ok: false, skip: "cwl-multi-gold-threw" };
  }
  const cwlMultiGoldRuntimeOk = cwlMultiGoldRuntime.ok === true;
  let cwlParamsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlParamsBatch = await runCwlParamsBatchSmoke();
  } catch {
    cwlParamsBatch = { ok: false, skip: "cwl-params-batch-threw" };
  }
  const cwlParamsBatchOk = cwlParamsBatch.ok === true;
  let cwlMultiRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlMultiRoundtrip = await runCwlMultiRoundtripSmoke();
  } catch {
    cwlMultiRoundtrip = { ok: false, skip: "cwl-multi-roundtrip-threw" };
  }
  const cwlMultiRoundtripOk = cwlMultiRoundtrip.ok === true;
  let siteIntelligenceStandalone = { ok: false, skip: "not-run-in-completion" };
  try {
    siteIntelligenceStandalone = await runSiteIntelligenceSmoke();
  } catch {
    siteIntelligenceStandalone = { ok: false, skip: "site-intelligence-standalone-threw" };
  }
  const siteIntelligenceStandaloneOk = siteIntelligenceStandalone.ok === true;
  let migrationAssessmentStandalone = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationAssessmentStandalone = await runMigrationAssessmentSmoke();
  } catch {
    migrationAssessmentStandalone = { ok: false, skip: "migration-assessment-standalone-threw" };
  }
  const migrationAssessmentStandaloneOk = migrationAssessmentStandalone.ok === true;
  let chimeraCutoverStandalone = { ok: false, skip: "not-run-in-completion" };
  try {
    chimeraCutoverStandalone = await runChimeraCutoverSmoke();
  } catch {
    chimeraCutoverStandalone = { ok: false, skip: "chimera-cutover-standalone-threw" };
  }
  const chimeraCutoverStandaloneOk = chimeraCutoverStandalone.ok === true;
  let pathKnowledgeSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    pathKnowledgeSmoke = runPathKnowledgeSmoke();
  } catch {
    pathKnowledgeSmoke = { ok: false, skip: "path-knowledge-smoke-threw" };
  }
  const pathKnowledgeSmokeOk = pathKnowledgeSmoke.ok === true;
  let languageCompareSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    languageCompareSmoke = runLanguageCompareSmoke();
  } catch {
    languageCompareSmoke = { ok: false, skip: "language-compare-smoke-threw" };
  }
  const languageCompareSmokeOk = languageCompareSmoke.ok === true;
  let migrationOsSymfony = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationOsSymfony = await runMigrationOsSymfonySmoke();
  } catch {
    migrationOsSymfony = { ok: false, skip: "migration-os-symfony-threw" };
  }
  const migrationOsSymfonyOk = migrationOsSymfony.ok === true;
  let migrationOsStandaloneBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationOsStandaloneBatch = await runMigrationOsStandaloneBatchSmoke();
  } catch {
    migrationOsStandaloneBatch = { ok: false, skip: "migration-os-standalone-batch-threw" };
  }
  const migrationOsStandaloneBatchOk = migrationOsStandaloneBatch.ok === true;
  let verifyGapsSymfonySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyGapsSymfonySmoke = runVerifyGapsSymfonySmoke();
  } catch {
    verifyGapsSymfonySmoke = { ok: false, skip: "verify-gaps-symfony-threw" };
  }
  const verifyGapsSymfonySmokeOk = verifyGapsSymfonySmoke.ok === true;
  let hubRunnerBatchSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    hubRunnerBatchSmoke = runHubRunnerBatchSmoke();
  } catch {
    hubRunnerBatchSmoke = { ok: false, skip: "hub-runner-batch-threw" };
  }
  const hubRunnerBatchSmokeOk = hubRunnerBatchSmoke.ok === true;
  let deliveryPipelineRunnerSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    deliveryPipelineRunnerSmoke = await runDeliveryPipelineRunnerSmoke();
  } catch {
    deliveryPipelineRunnerSmoke = { ok: false, skip: "delivery-pipeline-runner-threw" };
  }
  const deliveryPipelineRunnerSmokeOk = deliveryPipelineRunnerSmoke.ok === true;
  let pathAdviceSymfonySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    pathAdviceSymfonySmoke = await runPathAdviceSymfonySmoke();
  } catch {
    pathAdviceSymfonySmoke = { ok: false, skip: "path-advice-symfony-threw" };
  }
  const pathAdviceSymfonySmokeOk = pathAdviceSymfonySmoke.ok === true;
  let siteIntelligenceSymfonySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    siteIntelligenceSymfonySmoke = await runSiteIntelligenceSymfonySmoke();
  } catch {
    siteIntelligenceSymfonySmoke = { ok: false, skip: "site-intelligence-symfony-threw" };
  }
  const siteIntelligenceSymfonySmokeOk = siteIntelligenceSymfonySmoke.ok === true;
  let postTranslateArtifactsSymfonySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateArtifactsSymfonySmoke = await runPostTranslateArtifactsSymfonySmoke();
  } catch {
    postTranslateArtifactsSymfonySmoke = { ok: false, skip: "post-translate-artifacts-symfony-threw" };
  }
  const postTranslateArtifactsSymfonySmokeOk = postTranslateArtifactsSymfonySmoke.ok === true;
  let cwlParamsRoundtripBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlParamsRoundtripBatch = await runCwlParamsRoundtripBatchSmoke();
  } catch {
    cwlParamsRoundtripBatch = { ok: false, skip: "cwl-params-roundtrip-batch-threw" };
  }
  const cwlParamsRoundtripBatchOk = cwlParamsRoundtripBatch.ok === true;
  let cwlMultiBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlMultiBatch = await runCwlMultiBatchSmoke();
  } catch {
    cwlMultiBatch = { ok: false, skip: "cwl-multi-batch-threw" };
  }
  const cwlMultiBatchOk = cwlMultiBatch.ok === true;
  let cwlInterchangeBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlInterchangeBatch = await runCwlInterchangeBatchSmoke();
  } catch {
    cwlInterchangeBatch = { ok: false, skip: "cwl-interchange-batch-threw" };
  }
  const cwlInterchangeBatchOk = cwlInterchangeBatch.ok === true;
  let evidenceLiveStandaloneBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    evidenceLiveStandaloneBatch = await runEvidenceLiveStandaloneBatchSmoke();
  } catch {
    evidenceLiveStandaloneBatch = { ok: false, skip: "evidence-live-standalone-batch-threw" };
  }
  const evidenceLiveStandaloneBatchOk = evidenceLiveStandaloneBatch.ok === true;
  let translateE2eStandaloneBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    translateE2eStandaloneBatch = runTranslateE2eStandaloneBatchSmoke();
  } catch {
    translateE2eStandaloneBatch = { ok: false, skip: "translate-e2e-standalone-batch-threw" };
  }
  const translateE2eStandaloneBatchOk = translateE2eStandaloneBatch.ok === true;
  let expressDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    expressDeliveryBatch = await runExpressDeliveryBatchSmoke();
  } catch {
    expressDeliveryBatch = { ok: false, skip: "express-delivery-batch-threw" };
  }
  const expressDeliveryBatchOk = expressDeliveryBatch.ok === true;
  let symfonyMigrationOsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    symfonyMigrationOsBatch = await runSymfonyMigrationOsBatchSmoke();
  } catch {
    symfonyMigrationOsBatch = { ok: false, skip: "symfony-migration-os-batch-threw" };
  }
  const symfonyMigrationOsBatchOk = symfonyMigrationOsBatch.ok === true;
  let projectToCwlExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    projectToCwlExpressSmoke = await runProjectToCwlExpressSmoke();
  } catch {
    projectToCwlExpressSmoke = { ok: false, skip: "project-to-cwl-express-threw" };
  }
  const projectToCwlExpressSmokeOk = projectToCwlExpressSmoke.ok === true;
  let siteIntelligenceExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    siteIntelligenceExpressSmoke = await runSiteIntelligenceExpressSmoke();
  } catch {
    siteIntelligenceExpressSmoke = { ok: false, skip: "site-intelligence-express-threw" };
  }
  const siteIntelligenceExpressSmokeOk = siteIntelligenceExpressSmoke.ok === true;
  let pathAdviceExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    pathAdviceExpressSmoke = await runPathAdviceExpressSmoke();
  } catch {
    pathAdviceExpressSmoke = { ok: false, skip: "path-advice-express-threw" };
  }
  const pathAdviceExpressSmokeOk = pathAdviceExpressSmoke.ok === true;
  let verifyGapsExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyGapsExpressSmoke = runVerifyGapsExpressSmoke();
  } catch {
    verifyGapsExpressSmoke = { ok: false, skip: "verify-gaps-express-threw" };
  }
  const verifyGapsExpressSmokeOk = verifyGapsExpressSmoke.ok === true;
  let postTranslateArtifactsExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateArtifactsExpressSmoke = await runPostTranslateArtifactsExpressSmoke();
  } catch {
    postTranslateArtifactsExpressSmoke = { ok: false, skip: "post-translate-artifacts-express-threw" };
  }
  const postTranslateArtifactsExpressSmokeOk = postTranslateArtifactsExpressSmoke.ok === true;
  let migrationAssessmentSymfonySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationAssessmentSymfonySmoke = await runMigrationAssessmentSymfonySmoke();
  } catch {
    migrationAssessmentSymfonySmoke = { ok: false, skip: "migration-assessment-symfony-threw" };
  }
  const migrationAssessmentSymfonySmokeOk = migrationAssessmentSymfonySmoke.ok === true;
  let chimeraCutoverSymfonySmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    chimeraCutoverSymfonySmoke = await runChimeraCutoverSymfonySmoke();
  } catch {
    chimeraCutoverSymfonySmoke = { ok: false, skip: "chimera-cutover-symfony-threw" };
  }
  const chimeraCutoverSymfonySmokeOk = chimeraCutoverSymfonySmoke.ok === true;
  let migrationAssessmentExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationAssessmentExpressSmoke = await runMigrationAssessmentExpressSmoke();
  } catch {
    migrationAssessmentExpressSmoke = { ok: false, skip: "migration-assessment-express-threw" };
  }
  const migrationAssessmentExpressSmokeOk = migrationAssessmentExpressSmoke.ok === true;
  let chimeraCutoverExpressSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    chimeraCutoverExpressSmoke = await runChimeraCutoverExpressSmoke();
  } catch {
    chimeraCutoverExpressSmoke = { ok: false, skip: "chimera-cutover-express-threw" };
  }
  const chimeraCutoverExpressSmokeOk = chimeraCutoverExpressSmoke.ok === true;
  let siteIntelligenceLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    siteIntelligenceLaravelMinSmoke = await runSiteIntelligenceLaravelMinSmoke();
  } catch {
    siteIntelligenceLaravelMinSmoke = { ok: false, skip: "site-intelligence-laravel-min-threw" };
  }
  const siteIntelligenceLaravelMinSmokeOk = siteIntelligenceLaravelMinSmoke.ok === true;
  let pathAdviceLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    pathAdviceLaravelMinSmoke = await runPathAdviceLaravelMinSmoke();
  } catch {
    pathAdviceLaravelMinSmoke = { ok: false, skip: "path-advice-laravel-min-threw" };
  }
  const pathAdviceLaravelMinSmokeOk = pathAdviceLaravelMinSmoke.ok === true;
  let migrationAssessmentLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationAssessmentLaravelMinSmoke = await runMigrationAssessmentLaravelMinSmoke();
  } catch {
    migrationAssessmentLaravelMinSmoke = { ok: false, skip: "migration-assessment-laravel-min-threw" };
  }
  const migrationAssessmentLaravelMinSmokeOk = migrationAssessmentLaravelMinSmoke.ok === true;
  let chimeraCutoverLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    chimeraCutoverLaravelMinSmoke = await runChimeraCutoverLaravelMinSmoke();
  } catch {
    chimeraCutoverLaravelMinSmoke = { ok: false, skip: "chimera-cutover-laravel-min-threw" };
  }
  const chimeraCutoverLaravelMinSmokeOk = chimeraCutoverLaravelMinSmoke.ok === true;
  let postTranslateArtifactsLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateArtifactsLaravelMinSmoke = await runPostTranslateArtifactsLaravelMinSmoke();
  } catch {
    postTranslateArtifactsLaravelMinSmoke = { ok: false, skip: "post-translate-artifacts-laravel-min-threw" };
  }
  const postTranslateArtifactsLaravelMinSmokeOk = postTranslateArtifactsLaravelMinSmoke.ok === true;
  let projectToCwlLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    projectToCwlLaravelMinSmoke = await runProjectToCwlLaravelMinSmoke();
  } catch {
    projectToCwlLaravelMinSmoke = { ok: false, skip: "project-to-cwl-laravel-min-threw" };
  }
  const projectToCwlLaravelMinSmokeOk = projectToCwlLaravelMinSmoke.ok === true;
  let verifyGapsLaravelMinSmoke = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyGapsLaravelMinSmoke = runVerifyGapsLaravelMinSmoke();
  } catch {
    verifyGapsLaravelMinSmoke = { ok: false, skip: "verify-gaps-laravel-min-threw" };
  }
  const verifyGapsLaravelMinSmokeOk = verifyGapsLaravelMinSmoke.ok === true;
  let laravelMinDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelMinDeliveryBatch = await runLaravelMinDeliveryBatchSmoke();
  } catch {
    laravelMinDeliveryBatch = { ok: false, skip: "laravel-min-delivery-batch-threw" };
  }
  const laravelMinDeliveryBatchOk = laravelMinDeliveryBatch.ok === true;
  let plainPhpDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    plainPhpDeliveryBatch = await runPlainPhpDeliveryBatchSmoke();
  } catch {
    plainPhpDeliveryBatch = { ok: false, skip: "plain-php-delivery-batch-threw" };
  }
  const plainPhpDeliveryBatchOk = plainPhpDeliveryBatch.ok === true;
  let threeOriginDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    threeOriginDeliveryBatch = await runThreeOriginDeliveryBatchSmoke();
  } catch {
    threeOriginDeliveryBatch = { ok: false, skip: "three-origin-delivery-batch-threw" };
  }
  const threeOriginDeliveryBatchOk = threeOriginDeliveryBatch.ok === true;
  let laravelDepthBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelDepthBatch = runLaravelDepthBatchSmoke();
  } catch {
    laravelDepthBatch = { ok: false, skip: "laravel-depth-batch-threw" };
  }
  const laravelDepthBatchOk = laravelDepthBatch.ok === true;
  let cwlFullBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlFullBatch = await runCwlFullBatchSmoke();
  } catch {
    cwlFullBatch = { ok: false, skip: "cwl-full-batch-threw" };
  }
  const cwlFullBatchOk = cwlFullBatch.ok === true;
  let tinyBlogOracleBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    tinyBlogOracleBatch = await runTinyBlogOracleBatchSmoke();
  } catch {
    tinyBlogOracleBatch = { ok: false, skip: "tiny-blog-oracle-batch-threw" };
  }
  const tinyBlogOracleBatchOk = tinyBlogOracleBatch.ok === true;
  let fourOriginDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    fourOriginDeliveryBatch = await runFourOriginDeliveryBatchSmoke();
  } catch {
    fourOriginDeliveryBatch = { ok: false, skip: "four-origin-delivery-batch-threw" };
  }
  const fourOriginDeliveryBatchOk = fourOriginDeliveryBatch.ok === true;
  let symfonyDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    symfonyDeliveryBatch = await runSymfonyDeliveryBatchSmoke();
  } catch {
    symfonyDeliveryBatch = { ok: false, skip: "symfony-delivery-batch-threw" };
  }
  const symfonyDeliveryBatchOk = symfonyDeliveryBatch.ok === true;
  let laravelMinMigrationOsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelMinMigrationOsBatch = await runLaravelMinMigrationOsBatchSmoke();
  } catch {
    laravelMinMigrationOsBatch = { ok: false, skip: "laravel-min-migration-os-batch-threw" };
  }
  const laravelMinMigrationOsBatchOk = laravelMinMigrationOsBatch.ok === true;
  let oracleStandaloneBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    oracleStandaloneBatch = await runOracleStandaloneBatchSmoke();
  } catch {
    oracleStandaloneBatch = { ok: false, skip: "oracle-standalone-batch-threw" };
  }
  const oracleStandaloneBatchOk = oracleStandaloneBatch.ok === true;
  let fullDeliveryMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    fullDeliveryMegaBatch = await runFullDeliveryMegaBatchSmoke();
  } catch {
    fullDeliveryMegaBatch = { ok: false, skip: "full-delivery-mega-batch-threw" };
  }
  const fullDeliveryMegaBatchOk = fullDeliveryMegaBatch.ok === true;
  let cwlMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlMegaBatch = await runCwlMegaBatchSmoke();
  } catch {
    cwlMegaBatch = { ok: false, skip: "cwl-mega-batch-threw" };
  }
  const cwlMegaBatchOk = cwlMegaBatch.ok === true;
  let fullstackAuthoringBatchV2 = { ok: false, skip: "not-run-in-completion" };
  try {
    fullstackAuthoringBatchV2 = await runCwlAuthoringBatchV2Smoke();
  } catch {
    fullstackAuthoringBatchV2 = { ok: false, skip: "fullstack-authoring-batch-v2-threw" };
  }
  const fullstackAuthoringBatchV2Ok = fullstackAuthoringBatchV2.ok === true;
  let fullstackAuthoringBatchV3 = { ok: false, skip: "not-run-in-completion" };
  try {
    fullstackAuthoringBatchV3 = await runCwlAuthoringBatchV3Smoke();
  } catch {
    fullstackAuthoringBatchV3 = { ok: false, skip: "fullstack-authoring-batch-v3-threw" };
  }
  const fullstackAuthoringBatchV3Ok = fullstackAuthoringBatchV3.ok === true;
  let plainPhpMigrationOsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    plainPhpMigrationOsBatch = await runPlainPhpMigrationOsBatchSmoke();
  } catch {
    plainPhpMigrationOsBatch = { ok: false, skip: "plain-php-migration-os-batch-threw" };
  }
  const plainPhpMigrationOsBatchOk = plainPhpMigrationOsBatch.ok === true;
  let tinyBlogDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    tinyBlogDeliveryBatch = await runTinyBlogDeliveryBatchSmoke();
  } catch {
    tinyBlogDeliveryBatch = { ok: false, skip: "tiny-blog-delivery-batch-threw" };
  }
  const tinyBlogDeliveryBatchOk = tinyBlogDeliveryBatch.ok === true;
  let deliveryPipelineStandaloneBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    deliveryPipelineStandaloneBatch = await runDeliveryPipelineStandaloneBatchSmoke();
  } catch {
    deliveryPipelineStandaloneBatch = { ok: false, skip: "delivery-pipeline-standalone-batch-threw" };
  }
  const deliveryPipelineStandaloneBatchOk = deliveryPipelineStandaloneBatch.ok === true;
  let laravelMinOracleBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelMinOracleBatch = await runLaravelMinOracleBatchSmoke();
  } catch {
    laravelMinOracleBatch = { ok: false, skip: "laravel-min-oracle-batch-threw" };
  }
  const laravelMinOracleBatchOk = laravelMinOracleBatch.ok === true;
  let advisoryStandaloneMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    advisoryStandaloneMegaBatch = runAdvisoryStandaloneMegaBatchSmoke();
  } catch {
    advisoryStandaloneMegaBatch = { ok: false, skip: "advisory-standalone-mega-batch-threw" };
  }
  const advisoryStandaloneMegaBatchOk = advisoryStandaloneMegaBatch.ok === true;
  let allDeliveryUltraMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    allDeliveryUltraMegaBatch = await runAllDeliveryUltraMegaBatchSmoke();
  } catch {
    allDeliveryUltraMegaBatch = { ok: false, skip: "all-delivery-ultra-mega-batch-threw" };
  }
  const allDeliveryUltraMegaBatchOk = allDeliveryUltraMegaBatch.ok === true;
  let migrationOsMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationOsMegaBatch = await runMigrationOsMegaBatchSmoke();
  } catch {
    migrationOsMegaBatch = { ok: false, skip: "migration-os-mega-batch-threw" };
  }
  const migrationOsMegaBatchOk = migrationOsMegaBatch.ok === true;
  let oracleProductUltraBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    oracleProductUltraBatch = await runOracleProductUltraBatchSmoke();
  } catch {
    oracleProductUltraBatch = { ok: false, skip: "oracle-product-ultra-batch-threw" };
  }
  const oracleProductUltraBatchOk = oracleProductUltraBatch.ok === true;
  let expressLaravelMinDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    expressLaravelMinDeliveryBatch = await runExpressLaravelMinDeliveryBatchSmoke();
  } catch {
    expressLaravelMinDeliveryBatch = { ok: false, skip: "express-laravel-min-delivery-batch-threw" };
  }
  const expressLaravelMinDeliveryBatchOk = expressLaravelMinDeliveryBatch.ok === true;
  let symfonyLaravelMinDeliveryBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    symfonyLaravelMinDeliveryBatch = await runSymfonyLaravelMinDeliveryBatchSmoke();
  } catch {
    symfonyLaravelMinDeliveryBatch = { ok: false, skip: "symfony-laravel-min-delivery-batch-threw" };
  }
  const symfonyLaravelMinDeliveryBatchOk = symfonyLaravelMinDeliveryBatch.ok === true;
  let postTranslateVerifyOriginBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateVerifyOriginBatch = await runPostTranslateVerifyOriginBatchSmoke();
  } catch {
    postTranslateVerifyOriginBatch = { ok: false, skip: "post-translate-verify-origin-batch-threw" };
  }
  const postTranslateVerifyOriginBatchOk = postTranslateVerifyOriginBatch.ok === true;
  let tinyBlogDepthBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    tinyBlogDepthBatch = await runTinyBlogDepthBatchSmoke();
  } catch {
    tinyBlogDepthBatch = { ok: false, skip: "tiny-blog-depth-batch-threw" };
  }
  const tinyBlogDepthBatchOk = tinyBlogDepthBatch.ok === true;
  let contractVerifyStandaloneBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    contractVerifyStandaloneBatch = await runContractVerifyStandaloneBatchSmoke();
  } catch {
    contractVerifyStandaloneBatch = { ok: false, skip: "contract-verify-standalone-batch-threw" };
  }
  const contractVerifyStandaloneBatchOk = contractVerifyStandaloneBatch.ok === true;
  let chimeraCutoverOriginBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    chimeraCutoverOriginBatch = await runChimeraCutoverOriginBatchSmoke();
  } catch {
    chimeraCutoverOriginBatch = { ok: false, skip: "chimera-cutover-origin-batch-threw" };
  }
  const chimeraCutoverOriginBatchOk = chimeraCutoverOriginBatch.ok === true;
  let migrationAssessmentOriginBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    migrationAssessmentOriginBatch = await runMigrationAssessmentOriginBatchSmoke();
  } catch {
    migrationAssessmentOriginBatch = { ok: false, skip: "migration-assessment-origin-batch-threw" };
  }
  const migrationAssessmentOriginBatchOk = migrationAssessmentOriginBatch.ok === true;
  let verifyGapsOriginBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyGapsOriginBatch = runVerifyGapsOriginBatchSmoke();
  } catch {
    verifyGapsOriginBatch = { ok: false, skip: "verify-gaps-origin-batch-threw" };
  }
  const verifyGapsOriginBatchOk = verifyGapsOriginBatch.ok === true;
  let postTranslateArtifactsOriginBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    postTranslateArtifactsOriginBatch = await runPostTranslateArtifactsOriginBatchSmoke();
  } catch {
    postTranslateArtifactsOriginBatch = { ok: false, skip: "post-translate-artifacts-origin-batch-threw" };
  }
  const postTranslateArtifactsOriginBatchOk = postTranslateArtifactsOriginBatch.ok === true;
  let verifyStandaloneMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyStandaloneMegaBatch = await runVerifyStandaloneMegaBatchSmoke();
  } catch {
    verifyStandaloneMegaBatch = { ok: false, skip: "verify-standalone-mega-batch-threw" };
  }
  const verifyStandaloneMegaBatchOk = verifyStandaloneMegaBatch.ok === true;
  let contractStandaloneMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    contractStandaloneMegaBatch = await runContractStandaloneMegaBatchSmoke();
  } catch {
    contractStandaloneMegaBatch = { ok: false, skip: "contract-standalone-mega-batch-threw" };
  }
  const contractStandaloneMegaBatchOk = contractStandaloneMegaBatch.ok === true;
  let evidenceStandaloneMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    evidenceStandaloneMegaBatch = await runEvidenceStandaloneMegaBatchSmoke();
  } catch {
    evidenceStandaloneMegaBatch = { ok: false, skip: "evidence-standalone-mega-batch-threw" };
  }
  const evidenceStandaloneMegaBatchOk = evidenceStandaloneMegaBatch.ok === true;
  let plainPhpDepthBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    plainPhpDepthBatch = await runPlainPhpDepthBatchSmoke();
  } catch {
    plainPhpDepthBatch = { ok: false, skip: "plain-php-depth-batch-threw" };
  }
  const plainPhpDepthBatchOk = plainPhpDepthBatch.ok === true;
  let symfonyDepthBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    symfonyDepthBatch = await runSymfonyDepthBatchSmoke();
  } catch {
    symfonyDepthBatch = { ok: false, skip: "symfony-depth-batch-threw" };
  }
  const symfonyDepthBatchOk = symfonyDepthBatch.ok === true;
  let expressDepthBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    expressDepthBatch = await runExpressDepthBatchSmoke();
  } catch {
    expressDepthBatch = { ok: false, skip: "express-depth-batch-threw" };
  }
  const expressDepthBatchOk = expressDepthBatch.ok === true;
  let laravelMinDepthBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelMinDepthBatch = await runLaravelMinDepthBatchSmoke();
  } catch {
    laravelMinDepthBatch = { ok: false, skip: "laravel-min-depth-batch-threw" };
  }
  const laravelMinDepthBatchOk = laravelMinDepthBatch.ok === true;
  let originDepthUltraBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    originDepthUltraBatch = await runOriginDepthUltraBatchSmoke();
  } catch {
    originDepthUltraBatch = { ok: false, skip: "origin-depth-ultra-batch-threw" };
  }
  const originDepthUltraBatchOk = originDepthUltraBatch.ok === true;
  let chimeraAssessmentMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    chimeraAssessmentMegaBatch = await runChimeraAssessmentMegaBatchSmoke();
  } catch {
    chimeraAssessmentMegaBatch = { ok: false, skip: "chimera-assessment-mega-batch-threw" };
  }
  const chimeraAssessmentMegaBatchOk = chimeraAssessmentMegaBatch.ok === true;
  let verifyProductUltraBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    verifyProductUltraBatch = await runVerifyProductUltraBatchSmoke();
  } catch {
    verifyProductUltraBatch = { ok: false, skip: "verify-product-ultra-batch-threw" };
  }
  const verifyProductUltraBatchOk = verifyProductUltraBatch.ok === true;
  let projectToCwlAllOrigins = { ok: false, skip: "not-run-in-completion" };
  try {
    projectToCwlAllOrigins = await runProjectToCwlAllOrigins();
  } catch {
    projectToCwlAllOrigins = { ok: false, skip: "project-to-cwl-all-origins-threw" };
  }
  const projectToCwlAllOriginsOk = projectToCwlAllOrigins.ok === true;
  let cwlAllOriginsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlAllOriginsBatch = await runCwlAllOriginsBatchSmoke();
  } catch {
    cwlAllOriginsBatch = { ok: false, skip: "cwl-all-origins-batch-threw" };
  }
  const cwlAllOriginsBatchOk = cwlAllOriginsBatch.ok === true;
  let cwlUniversalMegaBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlUniversalMegaBatch = await runCwlUniversalMegaBatchSmoke();
  } catch {
    cwlUniversalMegaBatch = { ok: false, skip: "cwl-universal-mega-batch-threw" };
  }
  const cwlUniversalMegaBatchOk = cwlUniversalMegaBatch.ok === true;
  let cwlAppStackOriginsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlAppStackOriginsBatch = await runCwlAppStackOriginsBatchSmoke();
  } catch {
    cwlAppStackOriginsBatch = { ok: false, skip: "cwl-app-stack-origins-batch-threw" };
  }
  const cwlAppStackOriginsBatchOk = cwlAppStackOriginsBatch.ok === true;
  let cwlAssetOriginsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlAssetOriginsBatch = await runCwlAssetOriginsBatchSmoke();
  } catch {
    cwlAssetOriginsBatch = { ok: false, skip: "cwl-asset-origins-batch-threw" };
  }
  const cwlAssetOriginsBatchOk = cwlAssetOriginsBatch.ok === true;
  let cwlPatternLiteralCwlBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlPatternLiteralCwlBatch = runCwlPatternLiteralCwlBatchSmoke();
  } catch {
    cwlPatternLiteralCwlBatch = { ok: false, skip: "cwl-pattern-literal-cwl-batch-threw" };
  }
  const cwlPatternLiteralCwlBatchOk = cwlPatternLiteralCwlBatch.ok === true;
  let hubTranslateCwlCoverage = { ok: false, skip: "not-run-in-completion" };
  try {
    hubTranslateCwlCoverage = runHubTranslateCwlCoverageSmoke();
  } catch {
    hubTranslateCwlCoverage = { ok: false, skip: "hub-translate-cwl-coverage-threw" };
  }
  const hubTranslateCwlCoverageOk = hubTranslateCwlCoverage.ok === true;
  let cwlPatternLiteralRoundtripBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlPatternLiteralRoundtripBatch = runCwlPatternLiteralRoundtripBatchSmoke();
  } catch {
    cwlPatternLiteralRoundtripBatch = { ok: false, skip: "cwl-pattern-literal-roundtrip-batch-threw" };
  }
  const cwlPatternLiteralRoundtripBatchOk = cwlPatternLiteralRoundtripBatch.ok === true;
  let cwlFlagshipRoundtripBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    cwlFlagshipRoundtripBatch = runCwlFlagshipRoundtripBatchSmoke();
  } catch {
    cwlFlagshipRoundtripBatch = { ok: false, skip: "cwl-flagship-roundtrip-batch-threw" };
  }
  const cwlFlagshipRoundtripBatchOk = cwlFlagshipRoundtripBatch.ok === true;
  let hubTranslateCwlRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    hubTranslateCwlRoundtrip = runHubTranslateCwlRoundtripSmoke();
  } catch {
    hubTranslateCwlRoundtrip = { ok: false, skip: "hub-translate-cwl-roundtrip-threw" };
  }
  const hubTranslateCwlRoundtripOk = hubTranslateCwlRoundtrip.ok === true;
  let projectToCwlRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    projectToCwlRoundtrip = await runProjectToCwlRoundtripSmoke();
  } catch {
    projectToCwlRoundtrip = { ok: false, skip: "project-to-cwl-roundtrip-threw" };
  }
  const projectToCwlRoundtripOk = projectToCwlRoundtrip.ok === true;
  let contractImportCwlRoundtrip = { ok: false, skip: "not-run-in-completion" };
  try {
    contractImportCwlRoundtrip = await runContractImportCwlRoundtripSmoke();
  } catch {
    contractImportCwlRoundtrip = { ok: false, skip: "contract-import-cwl-roundtrip-threw" };
  }
  const contractImportCwlRoundtripOk = contractImportCwlRoundtrip.ok === true;
  let phpOracleMicroVerifyBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    phpOracleMicroVerifyBatch = await runPhpOracleMicroVerifyBatchSmoke();
  } catch {
    phpOracleMicroVerifyBatch = { ok: false, skip: "php-oracle-micro-verify-batch-threw" };
  }
  const phpOracleMicroVerifyBatchOk = phpOracleMicroVerifyBatch.ok === true;
  let phpNextjsVerifyBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    phpNextjsVerifyBatch = await runPhpNextjsVerifyBatchSmoke();
  } catch {
    phpNextjsVerifyBatch = { ok: false, skip: "php-nextjs-verify-batch-threw" };
  }
  const phpNextjsVerifyBatchOk = phpNextjsVerifyBatch.ok === true;
  let phpWedgeBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    phpWedgeBatch = await runPhpWedgeBatchSmoke();
  } catch {
    phpWedgeBatch = { ok: false, skip: "php-wedge-batch-threw" };
  }
  const phpWedgeBatchOk = phpWedgeBatch.ok === true;
  let hubEvidenceMvpBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    hubEvidenceMvpBatch = await runHubEvidenceMvpBatchSmoke();
  } catch {
    hubEvidenceMvpBatch = { ok: false, skip: "hub-evidence-mvp-batch-threw" };
  }
  const hubEvidenceMvpBatchOk = hubEvidenceMvpBatch.ok === true;
  let wptpStrictBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    wptpStrictBatch = await runWptpStrictBatchSmoke();
  } catch {
    wptpStrictBatch = { ok: false, skip: "wptp-strict-batch-threw" };
  }
  const wptpStrictBatchOk =
    wptpStrictBatch.ok === true ||
    wptpStrictBatch.skip === "no-wptp-emit-nextjs" ||
    wptpStrictBatch.skip === "no-wptp-matrix";
  let flagshipFullGapsBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    flagshipFullGapsBatch = await runFlagshipFullGapsBatchSmoke();
  } catch {
    flagshipFullGapsBatch = { ok: false, skip: "flagship-full-gaps-batch-threw" };
  }
  const flagshipFullGapsBatchOk = flagshipFullGapsBatch.ok === true;
  let gapsIngestClosureBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    gapsIngestClosureBatch = await runGapsIngestClosureBatchSmoke();
  } catch {
    gapsIngestClosureBatch = { ok: false, skip: "gaps-ingest-closure-batch-threw" };
  }
  const gapsIngestClosureBatchOk = gapsIngestClosureBatch.ok === true;
  let gapsIngestStrictBatch = { ok: false, skip: "not-run-in-completion" };
  try {
    gapsIngestStrictBatch = await runGapsIngestStrictBatchSmoke();
  } catch {
    gapsIngestStrictBatch = { ok: false, skip: "gaps-ingest-strict-batch-threw" };
  }
  const gapsIngestStrictBatchOk = gapsIngestStrictBatch.ok === true;
  let laravelAuthProbeReingest = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelAuthProbeReingest = await runLaravelAuthProbeReingestSmoke();
  } catch {
    laravelAuthProbeReingest = { ok: false, skip: "laravel-auth-probe-reingest-threw" };
  }
  const laravelAuthProbeReingestOk = laravelAuthProbeReingest.ok === true;
  let laravelAuthProbeVerifyClosure = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelAuthProbeVerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();
  } catch {
    laravelAuthProbeVerifyClosure = { ok: false, skip: "laravel-auth-probe-verify-closure-threw" };
  }
  const laravelAuthProbeVerifyClosureOk = laravelAuthProbeVerifyClosure.ok === true;
  let laravelAuthProbeVerifyReplay = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelAuthProbeVerifyReplay = await runLaravelAuthProbeReingestVerifyReplaySmoke();
  } catch {
    laravelAuthProbeVerifyReplay = { ok: false, skip: "laravel-auth-probe-verify-replay-threw" };
  }
  const laravelAuthProbeVerifyReplayOk = laravelAuthProbeVerifyReplay.ok === true;
  let flagshipVerifyReplay = { ok: false, skip: "not-run-in-completion" };
  try {
    flagshipVerifyReplay = await runFlagshipVerifyReplayBatchSmoke();
  } catch {
    flagshipVerifyReplay = { ok: false, skip: "flagship-verify-replay-threw" };
  }
  const flagshipVerifyReplayOk = flagshipVerifyReplay.ok === true;
  let irHelperLifting = { ok: false, skip: "not-run-in-completion" };
  try {
    irHelperLifting = runIrHelperLiftingSmoke();
  } catch {
    irHelperLifting = { ok: false, skip: "ir-helper-lifting-threw" };
  }
  const irHelperLiftingOk = irHelperLifting.ok === true;
  let laravelAuthProbeVerifyHttp = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelAuthProbeVerifyHttp = await runLaravelAuthProbeReingestVerifyHttpSmoke();
  } catch {
    laravelAuthProbeVerifyHttp = { ok: false, skip: "laravel-auth-probe-verify-http-threw" };
  }
  const laravelAuthProbeVerifyHttpOk = laravelAuthProbeVerifyHttp.ok === true;
  let flagshipVerifyHttp = { ok: false, skip: "not-run-in-completion" };
  try {
    flagshipVerifyHttp = await runFlagshipVerifyHttpBatchSmoke();
  } catch {
    flagshipVerifyHttp = { ok: false, skip: "flagship-verify-http-threw" };
  }
  const flagshipVerifyHttpOk = flagshipVerifyHttp.ok === true;
  let irHelperLiftingSemantic = { ok: false, skip: "not-run-in-completion" };
  try {
    irHelperLiftingSemantic = runIrHelperLiftingSemanticSmoke();
  } catch {
    irHelperLiftingSemantic = { ok: false, skip: "ir-helper-lifting-semantic-threw" };
  }
  const irHelperLiftingSemanticOk = irHelperLiftingSemantic.ok === true;
  let irHelperLiftingEmbed = { ok: false, skip: "not-run-in-completion" };
  try {
    irHelperLiftingEmbed = runIrHelperLiftingEmbedSmoke();
  } catch {
    irHelperLiftingEmbed = { ok: false, skip: "ir-helper-lifting-embed-threw" };
  }
  const irHelperLiftingEmbedOk = irHelperLiftingEmbed.ok === true;
  let laravelAuthProbeVerifyHttpFastify = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelAuthProbeVerifyHttpFastify = await runLaravelAuthProbeVerifyHttpFastify();
  } catch {
    laravelAuthProbeVerifyHttpFastify = { ok: false, skip: "laravel-auth-probe-verify-http-fastify-threw" };
  }
  const laravelAuthProbeVerifyHttpFastifyOk = laravelAuthProbeVerifyHttpFastify.ok === true;
  let flagshipVerifyHttpFastify = { ok: false, skip: "not-run-in-completion" };
  try {
    flagshipVerifyHttpFastify = await runFlagshipVerifyHttpFastifyBatchSmoke();
  } catch {
    flagshipVerifyHttpFastify = { ok: false, skip: "flagship-verify-http-fastify-threw" };
  }
  const flagshipVerifyHttpFastifyOk = flagshipVerifyHttpFastify.ok === true;
  let laravelAuthProbeReingestVerifyHttpFastify = { ok: false, skip: "not-run-in-completion" };
  try {
    laravelAuthProbeReingestVerifyHttpFastify = await runLaravelAuthProbeReingestVerifyHttpFastifySmoke();
  } catch {
    laravelAuthProbeReingestVerifyHttpFastify = { ok: false, skip: "laravel-auth-probe-reingest-verify-http-fastify-threw" };
  }
  const laravelAuthProbeReingestVerifyHttpFastifyOk = laravelAuthProbeReingestVerifyHttpFastify.ok === true;
  let irHelperLiftingFullPath = { ok: false, skip: "not-run-in-completion" };
  try {
    irHelperLiftingFullPath = runIrHelperLiftingFullPathSmoke();
  } catch {
    irHelperLiftingFullPath = { ok: false, skip: "ir-helper-lifting-full-path-threw" };
  }
  const irHelperLiftingFullPathOk = irHelperLiftingFullPath.ok === true;
  const laravelVerifyLive = exportHubLaravelVerifyLive();
  const laravelVerifyLiveOk =
    laravelVerifyLive.ok === true || laravelVerifyLive.error === "missing-summary";
  const completionSections = buildHubCompletionSections();
  const capabilityMatrix = buildHubCapabilityMatrixReport();
  const webDbCount = buildWebDatabaseCatalogReport().count;

  const ok =
    matrix.status === 0 &&
    (matrix.parsed.failed ?? 1) === 0 &&
    gold.status === 0 &&
    goldSuiteCountOk &&
    traceReplay.status === 0 &&
    traceSuiteCountOk &&
    nativeEmit.status === 0 &&
    (nativeEmit.parsed.failed ?? 1) === 0 &&
    synthesisOk &&
    goldCoverageOk &&
    multiLaneOk &&
    phpOracleOk &&
    phpNextjsVerifyOk &&
    phpNextjsFlagshipVerifyOk &&
    phpNextjsSymfonyVerifyOk &&
    cwlResponseStatusRuntimeOk &&
    cwlRequestBodyRuntimeOk &&
    projectToCwlExportOk &&
    hubEvidenceSmokeOk &&
    contractCwlSmokeOk &&
    nodeOracleSpikeOk &&
    hubTranslateE2eOk &&
    cwlBodyRoundtripOk &&
    cwlRequestContextRuntimeOk &&
    cwlResponseContentTypeRuntimeOk &&
    cwlAuthEffectsRuntimeOk &&
    cwlRfcRoundtripOk &&
    contractRoundtripOk &&
    hubEvidenceLiveOk &&
    deliveryPipelineSmokeOk &&
    verifyPlaybooksSmokeOk &&
    postTranslateVerifySmokeOk &&
    hubRunnerSmokeOk &&
    migrationOsSmokeOk &&
    cwlPreviewSmokeOk &&
    cwlOpenapiSmokeOk &&
    pathAdviceSmokeOk &&
    detectDatabasesSmokeOk &&
    postTranslateArtifactsSmokeOk &&
    cwlMiddlewareSmokeOk &&
    cwlDiffSmokeOk &&
    cwlAllRfcRoundtripOk &&
    wptpGoldSmokeOk &&
    evidenceTrendSmokeOk &&
    verifyGapsIngestSmokeOk &&
    cwlPathParamsRuntimeOk &&
    cwlQueryParamsRuntimeOk &&
    cwlMultiGoldRuntimeOk &&
    cwlParamsBatchOk &&
    cwlMultiRoundtripOk &&
    siteIntelligenceStandaloneOk &&
    migrationAssessmentStandaloneOk &&
    chimeraCutoverStandaloneOk &&
    pathKnowledgeSmokeOk &&
    languageCompareSmokeOk &&
    migrationOsSymfonyOk &&
    migrationOsStandaloneBatchOk &&
    verifyGapsSymfonySmokeOk &&
    hubRunnerBatchSmokeOk &&
    deliveryPipelineRunnerSmokeOk &&
    pathAdviceSymfonySmokeOk &&
    siteIntelligenceSymfonySmokeOk &&
    postTranslateArtifactsSymfonySmokeOk &&
    cwlParamsRoundtripBatchOk &&
    cwlMultiBatchOk &&
    cwlInterchangeBatchOk &&
    evidenceLiveStandaloneBatchOk &&
    translateE2eStandaloneBatchOk &&
    expressDeliveryBatchOk &&
    symfonyMigrationOsBatchOk &&
    projectToCwlExpressSmokeOk &&
    siteIntelligenceExpressSmokeOk &&
    pathAdviceExpressSmokeOk &&
    verifyGapsExpressSmokeOk &&
    postTranslateArtifactsExpressSmokeOk &&
    migrationAssessmentSymfonySmokeOk &&
    chimeraCutoverSymfonySmokeOk &&
    migrationAssessmentExpressSmokeOk &&
    chimeraCutoverExpressSmokeOk &&
    siteIntelligenceLaravelMinSmokeOk &&
    pathAdviceLaravelMinSmokeOk &&
    migrationAssessmentLaravelMinSmokeOk &&
    chimeraCutoverLaravelMinSmokeOk &&
    postTranslateArtifactsLaravelMinSmokeOk &&
    projectToCwlLaravelMinSmokeOk &&
    verifyGapsLaravelMinSmokeOk &&
    laravelMinDeliveryBatchOk &&
    plainPhpDeliveryBatchOk &&
    threeOriginDeliveryBatchOk &&
    laravelDepthBatchOk &&
    cwlFullBatchOk &&
    tinyBlogOracleBatchOk &&
    fourOriginDeliveryBatchOk &&
    symfonyDeliveryBatchOk &&
    laravelMinMigrationOsBatchOk &&
    oracleStandaloneBatchOk &&
    fullDeliveryMegaBatchOk &&
    cwlMegaBatchOk &&
    fullstackAuthoringBatchV2Ok &&
    fullstackAuthoringBatchV3Ok &&
    plainPhpMigrationOsBatchOk &&
    tinyBlogDeliveryBatchOk &&
    deliveryPipelineStandaloneBatchOk &&
    laravelMinOracleBatchOk &&
    advisoryStandaloneMegaBatchOk &&
    allDeliveryUltraMegaBatchOk &&
    migrationOsMegaBatchOk &&
    oracleProductUltraBatchOk &&
    expressLaravelMinDeliveryBatchOk &&
    symfonyLaravelMinDeliveryBatchOk &&
    postTranslateVerifyOriginBatchOk &&
    tinyBlogDepthBatchOk &&
    contractVerifyStandaloneBatchOk &&
    chimeraCutoverOriginBatchOk &&
    migrationAssessmentOriginBatchOk &&
    verifyGapsOriginBatchOk &&
    postTranslateArtifactsOriginBatchOk &&
    verifyStandaloneMegaBatchOk &&
    contractStandaloneMegaBatchOk &&
    evidenceStandaloneMegaBatchOk &&
    plainPhpDepthBatchOk &&
    symfonyDepthBatchOk &&
    expressDepthBatchOk &&
    laravelMinDepthBatchOk &&
    originDepthUltraBatchOk &&
    chimeraAssessmentMegaBatchOk &&
    verifyProductUltraBatchOk &&
    projectToCwlAllOriginsOk &&
    cwlAllOriginsBatchOk &&
    cwlUniversalMegaBatchOk &&
    cwlAppStackOriginsBatchOk &&
    cwlAssetOriginsBatchOk &&
    cwlPatternLiteralCwlBatchOk &&
    hubTranslateCwlCoverageOk &&
    cwlPatternLiteralRoundtripBatchOk &&
    cwlFlagshipRoundtripBatchOk &&
    hubTranslateCwlRoundtripOk &&
    projectToCwlRoundtripOk &&
    contractImportCwlRoundtripOk &&
    phpOracleMicroVerifyBatchOk &&
    phpNextjsVerifyBatchOk &&
    phpWedgeBatchOk &&
    hubEvidenceMvpBatchOk &&
    wptpStrictBatchOk &&
    flagshipFullGapsBatchOk &&
    gapsIngestClosureBatchOk &&
    gapsIngestStrictBatchOk &&
    laravelAuthProbeReingestOk &&
    laravelAuthProbeVerifyClosureOk &&
    laravelAuthProbeVerifyReplayOk &&
    flagshipVerifyReplayOk &&
    irHelperLiftingOk &&
    laravelAuthProbeVerifyHttpOk &&
    flagshipVerifyHttpOk &&
    irHelperLiftingSemanticOk &&
    irHelperLiftingEmbedOk &&
    laravelAuthProbeVerifyHttpFastifyOk &&
    flagshipVerifyHttpFastifyOk &&
    laravelAuthProbeReingestVerifyHttpFastifyOk &&
    irHelperLiftingFullPathOk &&
    laravelVerifyLiveOk &&
    expressFlagshipOk &&
    nodeExpressOracleOk &&
    plainPhpFlagshipOk &&
    symfonyFlagshipOk &&
    laravelMinSmokeOk;

  const licenseStatus = await buildHubLicenseStatusReport();

  const report = {
    kind: "chrysalis.hub.completion",
    schemaVersion: 76,
    ok,
    matrixSmoke: {
      passed: matrix.parsed.passed ?? 0,
      failed: matrix.parsed.failed ?? 0,
      skipped: matrix.parsed.skipped ?? 0,
    },
    goldVerify: {
      ok: goldSuiteCountOk,
      suiteCount: gold.parsed.suiteCount ?? structuralSuiteIds.length,
      expectedSuiteCount: structuralSuiteIds.length,
      suiteIds: structuralSuiteIds,
    },
    traceReplay: {
      ok: traceSuiteCountOk,
      correctness: traceParsed.correctness ?? 0,
      suiteCount: traceParsed.suiteCount ?? traceSuiteIds.length,
      expectedSuiteCount: traceSuiteIds.length,
      suiteIds: traceSuiteIds,
      targets: ["hono", "fastify", "nextjs"],
    },
    nextjsTraceReplay: {
      suites: [
        "js-literal-nextjs",
        "express-flagship-nextjs",
        "ts-literal-nextjs",
        "js-structured-nextjs",
        "ts-structured-nextjs",
        "js-middleware-nextjs",
        "python-middleware-nextjs",
        "cwl-gold-nextjs",
        "cwl-path-params-nextjs",
        "cwl-query-params-nextjs",
        "cwl-request-context-nextjs",
        "cwl-request-body-nextjs",
        "cwl-response-status-nextjs",
        "cwl-auth-effects-nextjs",
        "python-literal-nextjs",
        "contract-first-nextjs",
        "ruby-literal-nextjs",
        "java-literal-nextjs",
        "go-literal-nextjs",
        "csharp-literal-nextjs",
        "kotlin-literal-nextjs",
        "scala-literal-nextjs",
        "swift-literal-nextjs",
      "rust-literal-nextjs",
      "sql-literal-nextjs",
      "html-literal-nextjs",
      "json-literal-nextjs",
      "vue-literal-nextjs",
      "css-literal-nextjs",
      "scss-literal-nextjs",
      "markdown-literal-nextjs",
      "yaml-literal-nextjs",
      "c-literal-nextjs",
      "cpp-literal-nextjs",
    ],
  },
  crossFrameworkNextjsGold: {
      suiteIds: [
        "ruby-literal-nextjs",
        "java-literal-nextjs",
        "go-literal-nextjs",
        "csharp-literal-nextjs",
        "kotlin-literal-nextjs",
        "scala-literal-nextjs",
        "swift-literal-nextjs",
        "rust-literal-nextjs",
      ],
    },
    middlewareNextjsGold: {
      suiteIds: ["js-middleware-nextjs", "python-middleware-nextjs"],
    },
    cwlNextjsGold: {
      suiteIds: [
        "cwl-gold-nextjs",
        "cwl-path-params-nextjs",
        "cwl-query-params-nextjs",
        "cwl-request-context-nextjs",
        "cwl-request-body-nextjs",
        "cwl-response-status-nextjs",
      ],
    },
    pythonNextjsGold: {
      suiteIds: ["python-literal-nextjs", "python-middleware-nextjs"],
    },
    nativeEmitSmoke: {
      ok: nativeEmit.status === 0 && (nativeEmit.parsed.failed ?? 1) === 0,
      passed: nativeEmit.parsed.passed ?? 0,
      failed: nativeEmit.parsed.failed ?? 0,
    },
    oracleRecorders: {
      python: oraclePy.status === 0,
      node: oracleNode.status === 0,
    },
    crossLanguageSynthesis: {
      ok: synthesisOk,
      pairCount: synthesis.parsed.universe?.pairCount ?? 0,
      goldPairs: synthesis.parsed.gradeSummary?.gold ?? 0,
      originCount: synthesis.parsed.universe?.originCount ?? 0,
    },
    goldCoverage: {
      ok: goldCoverageOk,
      goldMatrix: goldCoverage.summary.goldMatrix,
      oracleTier: goldCoverage.summary.oracleTier,
      structuralTier: goldCoverage.summary.structuralTier,
      hubCiStructuralPairs: goldCoverage.summary.hubCiStructuralPairs,
      chrysalisCiGoldPairs: goldCoverage.summary.chrysalisCiGoldPairs,
      coverageGaps: goldCoverage.summary.coverageGaps,
    },
    nativeStructuralGold: {
      targets: hubNativeEmitTargetIds(),
      suiteIds: hubGoldStructuralSuiteIds().filter((id) => id.includes("-native-")),
      kotlinScalaSwift: ["kotlin-native-kotlin", "scala-native-scala", "swift-native-swift"],
    },
    middlewareTraceReplay: {
      jsonPostProbe: true,
      suites: [
        "js-middleware-hono",
        "js-middleware-fastify",
        "python-middleware-hono",
        "python-middleware-fastify",
      ],
    },
    crossFrameworkStructuralGold: {
      suiteIds: [
        "ruby-literal-hono",
        "ruby-literal-fastify",
        "java-literal-hono",
        "java-literal-fastify",
        "go-literal-hono",
        "go-literal-fastify",
        "csharp-literal-hono",
        "csharp-literal-fastify",
        "rust-literal-hono",
        "rust-literal-fastify",
      ],
    },
    middlewareCwlGold: {
      suiteIds: ["js-middleware-cwl", "python-middleware-cwl"],
    },
    cwlPathParamsGold: {
      suiteIds: ["cwl-path-params-hono", "cwl-path-params-fastify", "cwl-path-params-nextjs"],
      rfc: "CWL-RFC-0002",
    },
    cwlQueryParamsGold: {
      suiteIds: ["cwl-query-params-hono", "cwl-query-params-fastify", "cwl-query-params-nextjs"],
      rfc: "CWL-RFC-0003",
    },
    cwlRequestContextGold: {
      suiteIds: ["cwl-request-context-hono", "cwl-request-context-fastify", "cwl-request-context-nextjs"],
      rfc: "CWL-RFC-0004",
    },
    cwlRequestBodyGold: {
      suiteIds: ["cwl-request-body-hono", "cwl-request-body-fastify", "cwl-request-body-nextjs"],
      rfc: "CWL-RFC-0005",
    },
    cwlResponseStatusGold: {
      suiteIds: ["cwl-response-status-hono", "cwl-response-status-fastify", "cwl-response-status-nextjs"],
      rfc: "CWL-RFC-0006",
    },
    cwlResponseContentTypeGold: {
      suiteIds: [
        "cwl-response-content-type-hono",
        "cwl-response-content-type-fastify",
        "cwl-response-content-type-nextjs",
      ],
      rfc: "CWL-RFC-0008",
    },
    cwlAuthEffectsGold: {
      suiteIds: ["cwl-auth-effects-hono", "cwl-auth-effects-fastify", "cwl-auth-effects-nextjs"],
      rfc: "CWL-RFC-0007",
    },
    laravelVerifyGaps: {
      ok: laravelGaps.ok,
      backlogItems: laravelGaps.backlog?.length ?? 0,
      ingestNext: laravelGaps.ingestNext?.divergenceKind ?? null,
      exportScript: "pnpm run hub:laravel-verify-gaps",
      actionScript: "pnpm run hub:laravel-verify-gaps-action",
    },
    laravelVerifyGapsAction: {
      ok: laravelGapsAction.ok,
      ingestRemediation: laravelGapsAction.ingestRemediation?.divergenceKind ?? null,
      script: "pnpm run hub:laravel-verify-gaps-action",
    },
    hubEvidence: {
      schemaVersion: 31,
      failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
      pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
      requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
      requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
      requireCwlParamsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CWL_PARAMS",
      requireStandaloneDeliveryEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_STANDALONE_DELIVERY",
      requireLaravelMinEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_LARAVEL_MIN",
      requireFourOriginEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FOUR_ORIGIN",
      requireOracleUltraEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORACLE_ULTRA",
      requireOriginDepthEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_ORIGIN_DEPTH",
      requireUniversalCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_UNIVERSAL_CWL",
      requirePatternLiteralCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_CWL",
      requireTranslateCwlEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL",
      requirePatternLiteralRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PATTERN_LITERAL_ROUNDTRIP",
      requireTranslateCwlAllOriginsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ALL_ORIGINS",
      requireTranslateCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_TRANSLATE_CWL_ROUNDTRIP",
      requireFlagshipCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_CWL_ROUNDTRIP",
      requireProjectToCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PROJECT_TO_CWL_ROUNDTRIP",
      requireContractImportCwlRoundtripEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_CONTRACT_IMPORT_CWL_ROUNDTRIP",
      requirePhpOracleMicroVerifyEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_ORACLE_MICRO_VERIFY",
      requirePhpNextjsVerifyBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_NEXTJS_VERIFY_BATCH",
      requirePhpWedgeBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_PHP_WEDGE_BATCH",
      requireHubEvidenceMvpBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_HUB_EVIDENCE_MVP_BATCH",
      requireWptpStrictBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_STRICT_BATCH",
      requireFlagshipFullGapsBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_FLAGSHIP_FULL_GAPS_BATCH",
      requireGapsIngestClosureBatchEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
      requireGapReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST",
      requireGapReingestStrictEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
      requireGapReingestVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
      requireGapReingestVerifyReplayEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY",
      requireGapReingestVerifyHttpEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP",
      requireGapReingestVerifyHttpTargetEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP_TARGET",
    },
    laravelVerifyLive: {
      ok: laravelVerifyLive.ok === true,
      skip: laravelVerifyLive.error ?? null,
      aggregate: laravelVerifyLive.aggregate ?? null,
      script: "pnpm run hub:laravel-verify-export",
    },
    phpOracleMicro: {
      fixture: oracleMicro.fixture,
      routeCount: oracleMicro.routeCount,
      doc: oracleMicro.doc,
      script: "pnpm run hub:oracle-micro-fixture",
    },
    cwlResponseStatusRuntime: {
      ok: cwlResponseStatusRuntimeOk,
      rfc: "CWL-RFC-0006",
      withStatus: cwlResponseStatusRuntime.cwlProjection?.withStatus ?? null,
      script: "pnpm run hub:cwl-response-status-smoke",
    },
    cwlRequestBodyRuntime: {
      ok: cwlRequestBodyRuntimeOk,
      rfc: "CWL-RFC-0005",
      routeCount: cwlRequestBodyRuntime.cwlProjection?.total ?? null,
      holeFree: cwlRequestBodyRuntime.cwlProjection?.holeFree ?? null,
      withBodyParams: cwlRequestBodyRuntime.cwlProjection?.withBodyParams ?? null,
      projectionOk: cwlRequestBodyRuntime.projectionOk ?? null,
      script: "pnpm run hub:cwl-request-body-smoke",
    },
    projectToCwlExport: {
      ok: projectToCwlExportOk,
      schemaVersion: projectToCwlExport.schemaVersion ?? 3,
      plainPhp: projectToCwlExport.exports?.plainPhp ?? null,
      symfony: projectToCwlExport.exports?.symfony ?? null,
      express: projectToCwlExport.exports?.express ?? null,
      laravelMin: projectToCwlExport.exports?.laravelMin ?? null,
      tinyBlog: projectToCwlExport.exports?.tinyBlog ?? null,
      script: "pnpm run hub:project-to-cwl-gates",
    },
    phpNextjsFlagshipVerify: {
      ok: phpNextjsFlagshipVerifyOk,
      fixture: "fixtures/hub-flagship-plain-php",
      correctness: phpNextjsFlagshipVerify.correctness ?? null,
      skip: phpNextjsFlagshipVerify.skip ?? null,
      script: "pnpm run hub:php-nextjs-flagship-verify",
    },
    phpNextjsSymfonyVerify: {
      ok: phpNextjsSymfonyVerifyOk,
      fixture: "fixtures/hub-flagship-symfony",
      correctness: phpNextjsSymfonyVerify.correctness ?? null,
      skip: phpNextjsSymfonyVerify.skip ?? null,
      script: "pnpm run hub:php-nextjs-symfony-verify",
    },
    hubEvidenceSmoke: {
      ok: hubEvidenceSmokeOk,
      schemaVersion: hubEvidenceSmoke.schemaVersion ?? 1,
      script: "pnpm run hub:evidence-smoke",
    },
    hubEvidenceLive: {
      ok: hubEvidenceLiveOk,
      schemaVersion: 2,
      profiles: hubEvidenceLive.results ?? null,
      script: "pnpm run hub:evidence-live",
    },
    hubTranslateE2e: {
      ok: hubTranslateE2eOk,
      schemaVersion: 2,
      variants: hubTranslateE2e.results ?? null,
      script: "pnpm run hub:translate-e2e-smoke",
    },
    cwlRequestContextRuntime: {
      ok: cwlRequestContextRuntimeOk,
      rfc: "CWL-RFC-0004",
      withHeaderParams: cwlRequestContextRuntime.cwlProjection?.withHeaderParams ?? null,
      withCookieParams: cwlRequestContextRuntime.cwlProjection?.withCookieParams ?? null,
      script: "pnpm run hub:cwl-request-context-smoke",
    },
    cwlResponseContentTypeRuntime: {
      ok: cwlResponseContentTypeRuntimeOk,
      rfc: "CWL-RFC-0008",
      withContentType: cwlResponseContentTypeRuntime.cwlProjection?.withContentType ?? null,
      script: "pnpm run hub:cwl-response-content-type-smoke",
    },
    cwlAuthEffectsRuntime: {
      ok: cwlAuthEffectsRuntimeOk,
      rfc: "CWL-RFC-0007",
      script: "pnpm run hub:cwl-auth-effects-smoke",
    },
    cwlRfcRoundtrip: {
      ok: cwlRfcRoundtripOk,
      script: "pnpm run hub:cwl-rfc-roundtrip-smoke",
    },
    contractRoundtrip: {
      ok: contractRoundtripOk,
      script: "pnpm run hub:contract-roundtrip-smoke",
    },
    deliveryPipelineSmoke: {
      ok: deliveryPipelineSmokeOk,
      schemaVersion: 2,
      profiles: deliveryPipelineSmoke.results ?? null,
      script: "pnpm run hub:delivery-pipeline-smoke",
    },
    verifyPlaybooksSmoke: {
      ok: verifyPlaybooksSmokeOk,
      script: "pnpm run hub:verify-playbooks-smoke",
    },
    postTranslateVerifySmoke: {
      ok: postTranslateVerifySmokeOk,
      skip: postTranslateVerifySmoke.skip ?? null,
      script: "pnpm run hub:post-translate-verify-smoke",
    },
    hubRunnerSmoke: {
      ok: hubRunnerSmokeOk,
      stepKinds: hubRunnerSmoke.stepKinds ?? [],
      script: "pnpm run hub:runner-smoke",
    },
    migrationOsSmoke: {
      ok: migrationOsSmokeOk,
      script: "pnpm run hub:migration-os-smoke",
    },
    cwlPreviewSmoke: {
      ok: cwlPreviewSmokeOk,
      script: "pnpm run hub:cwl-preview-smoke",
    },
    cwlOpenapiSmoke: {
      ok: cwlOpenapiSmokeOk,
      script: "pnpm run hub:cwl-openapi-smoke",
    },
    pathAdviceSmoke: {
      ok: pathAdviceSmokeOk,
      script: "pnpm run hub:path-advice-smoke",
    },
    detectDatabasesSmoke: {
      ok: detectDatabasesSmokeOk,
      script: "pnpm run hub:detect-databases-smoke",
    },
    postTranslateArtifactsSmoke: {
      ok: postTranslateArtifactsSmokeOk,
      script: "pnpm run hub:post-translate-artifacts-smoke",
    },
    cwlMiddlewareSmoke: {
      ok: cwlMiddlewareSmokeOk,
      rfc: "CWL-RFC-0001",
      script: "pnpm run hub:cwl-middleware-smoke",
    },
    cwlDiffSmoke: {
      ok: cwlDiffSmokeOk,
      script: "pnpm run hub:cwl-diff-smoke",
    },
    cwlAllRfcRoundtrip: {
      ok: cwlAllRfcRoundtripOk,
      schemaVersion: cwlAllRfcRoundtrip.schemaVersion ?? 2,
      script: "pnpm run hub:cwl-all-rfc-roundtrip-smoke",
    },
    wptpGoldSmoke: {
      ok: wptpGoldSmokeOk,
      skip: wptpGoldSmoke.skip ?? null,
      script: "pnpm run hub:wptp-gold-smoke",
    },
    evidenceTrendSmoke: {
      ok: evidenceTrendSmokeOk,
      script: "pnpm run hub:evidence-trend-smoke",
    },
    verifyGapsIngestSmoke: {
      ok: verifyGapsIngestSmokeOk,
      script: "pnpm run hub:verify-gaps-ingest-smoke",
    },
    cwlPathParamsRuntime: {
      ok: cwlPathParamsRuntimeOk,
      rfc: "CWL-RFC-0002",
      script: "pnpm run hub:cwl-path-params-smoke",
    },
    cwlQueryParamsRuntime: {
      ok: cwlQueryParamsRuntimeOk,
      rfc: "CWL-RFC-0003",
      script: "pnpm run hub:cwl-query-params-smoke",
    },
    cwlMultiGoldRuntime: {
      ok: cwlMultiGoldRuntimeOk,
      rfc: "CWL-RFC-0009",
      script: "pnpm run hub:cwl-multi-gold-smoke",
    },
    cwlParamsBatch: {
      ok: cwlParamsBatchOk,
      script: "pnpm run hub:cwl-params-batch-smoke",
    },
    cwlMultiRoundtrip: {
      ok: cwlMultiRoundtripOk,
      rfc: "CWL-RFC-0009",
      script: "pnpm run hub:cwl-multi-roundtrip-smoke",
    },
    siteIntelligenceStandalone: {
      ok: siteIntelligenceStandaloneOk,
      script: "pnpm run hub:site-intelligence-smoke",
    },
    migrationAssessmentStandalone: {
      ok: migrationAssessmentStandaloneOk,
      script: "pnpm run hub:migration-assessment-smoke",
    },
    chimeraCutoverStandalone: {
      ok: chimeraCutoverStandaloneOk,
      script: "pnpm run hub:chimera-cutover-smoke",
    },
    pathKnowledgeSmoke: {
      ok: pathKnowledgeSmokeOk,
      script: "pnpm run hub:path-knowledge-smoke",
    },
    languageCompareSmoke: {
      ok: languageCompareSmokeOk,
      script: "pnpm run hub:language-compare-smoke",
    },
    migrationOsSymfony: {
      ok: migrationOsSymfonyOk,
      script: "pnpm run hub:migration-os-symfony-smoke",
    },
    migrationOsStandaloneBatch: {
      ok: migrationOsStandaloneBatchOk,
      script: "pnpm run hub:migration-os-standalone-batch-smoke",
    },
    verifyGapsSymfonySmoke: {
      ok: verifyGapsSymfonySmokeOk,
      script: "pnpm run hub:verify-gaps-symfony-smoke",
    },
    hubRunnerBatchSmoke: {
      ok: hubRunnerBatchSmokeOk,
      schemaVersion: hubRunnerBatchSmoke.schemaVersion ?? 2,
      script: "pnpm run hub:runner-batch-smoke",
    },
    deliveryPipelineRunnerSmoke: {
      ok: deliveryPipelineRunnerSmokeOk,
      schemaVersion: deliveryPipelineRunnerSmoke.schemaVersion ?? 3,
      script: "pnpm run hub:delivery-pipeline-runner-smoke",
    },
    pathAdviceSymfonySmoke: {
      ok: pathAdviceSymfonySmokeOk,
      script: "pnpm run hub:path-advice-symfony-smoke",
    },
    siteIntelligenceSymfonySmoke: {
      ok: siteIntelligenceSymfonySmokeOk,
      script: "pnpm run hub:site-intelligence-symfony-smoke",
    },
    postTranslateArtifactsSymfonySmoke: {
      ok: postTranslateArtifactsSymfonySmokeOk,
      script: "pnpm run hub:post-translate-artifacts-symfony-smoke",
    },
    cwlParamsRoundtripBatch: {
      ok: cwlParamsRoundtripBatchOk,
      script: "pnpm run hub:cwl-params-roundtrip-batch-smoke",
    },
    cwlMultiBatch: {
      ok: cwlMultiBatchOk,
      script: "pnpm run hub:cwl-multi-batch-smoke",
    },
    cwlInterchangeBatch: {
      ok: cwlInterchangeBatchOk,
      script: "pnpm run hub:cwl-interchange-batch-smoke",
    },
    evidenceLiveStandaloneBatch: {
      ok: evidenceLiveStandaloneBatchOk,
      script: "pnpm run hub:evidence-live-standalone-batch-smoke",
    },
    translateE2eStandaloneBatch: {
      ok: translateE2eStandaloneBatchOk,
      script: "pnpm run hub:translate-e2e-standalone-batch-smoke",
    },
    expressDeliveryBatch: {
      ok: expressDeliveryBatchOk,
      script: "pnpm run hub:express-delivery-batch-smoke",
    },
    symfonyMigrationOsBatch: {
      ok: symfonyMigrationOsBatchOk,
      script: "pnpm run hub:symfony-migration-os-batch-smoke",
    },
    projectToCwlExpressSmoke: {
      ok: projectToCwlExpressSmokeOk,
      script: "pnpm run hub:project-to-cwl-express-smoke",
    },
    siteIntelligenceExpressSmoke: {
      ok: siteIntelligenceExpressSmokeOk,
      script: "pnpm run hub:site-intelligence-express-smoke",
    },
    pathAdviceExpressSmoke: {
      ok: pathAdviceExpressSmokeOk,
      script: "pnpm run hub:path-advice-express-smoke",
    },
    verifyGapsExpressSmoke: {
      ok: verifyGapsExpressSmokeOk,
      script: "pnpm run hub:verify-gaps-express-smoke",
    },
    postTranslateArtifactsExpressSmoke: {
      ok: postTranslateArtifactsExpressSmokeOk,
      script: "pnpm run hub:post-translate-artifacts-express-smoke",
    },
    migrationAssessmentSymfonySmoke: {
      ok: migrationAssessmentSymfonySmokeOk,
      script: "pnpm run hub:migration-assessment-symfony-smoke",
    },
    chimeraCutoverSymfonySmoke: {
      ok: chimeraCutoverSymfonySmokeOk,
      script: "pnpm run hub:chimera-cutover-symfony-smoke",
    },
    migrationAssessmentExpressSmoke: {
      ok: migrationAssessmentExpressSmokeOk,
      script: "pnpm run hub:migration-assessment-express-smoke",
    },
    chimeraCutoverExpressSmoke: {
      ok: chimeraCutoverExpressSmokeOk,
      script: "pnpm run hub:chimera-cutover-express-smoke",
    },
    siteIntelligenceLaravelMinSmoke: {
      ok: siteIntelligenceLaravelMinSmokeOk,
      script: "pnpm run hub:site-intelligence-laravel-min-smoke",
    },
    pathAdviceLaravelMinSmoke: {
      ok: pathAdviceLaravelMinSmokeOk,
      script: "pnpm run hub:path-advice-laravel-min-smoke",
    },
    migrationAssessmentLaravelMinSmoke: {
      ok: migrationAssessmentLaravelMinSmokeOk,
      script: "pnpm run hub:migration-assessment-laravel-min-smoke",
    },
    chimeraCutoverLaravelMinSmoke: {
      ok: chimeraCutoverLaravelMinSmokeOk,
      script: "pnpm run hub:chimera-cutover-laravel-min-smoke",
    },
    postTranslateArtifactsLaravelMinSmoke: {
      ok: postTranslateArtifactsLaravelMinSmokeOk,
      script: "pnpm run hub:post-translate-artifacts-laravel-min-smoke",
    },
    projectToCwlLaravelMinSmoke: {
      ok: projectToCwlLaravelMinSmokeOk,
      script: "pnpm run hub:project-to-cwl-laravel-min-smoke",
    },
    verifyGapsLaravelMinSmoke: {
      ok: verifyGapsLaravelMinSmokeOk,
      script: "pnpm run hub:verify-gaps-laravel-min-smoke",
    },
    laravelMinDeliveryBatch: {
      ok: laravelMinDeliveryBatchOk,
      script: "pnpm run hub:laravel-min-delivery-batch-smoke",
    },
    plainPhpDeliveryBatch: {
      ok: plainPhpDeliveryBatchOk,
      script: "pnpm run hub:plain-php-delivery-batch-smoke",
    },
    threeOriginDeliveryBatch: {
      ok: threeOriginDeliveryBatchOk,
      script: "pnpm run hub:three-origin-delivery-batch-smoke",
    },
    laravelDepthBatch: {
      ok: laravelDepthBatchOk,
      script: "pnpm run hub:laravel-depth-batch-smoke",
    },
    cwlFullBatch: {
      ok: cwlFullBatchOk,
      script: "pnpm run hub:cwl-full-batch-smoke",
    },
    tinyBlogOracleBatch: {
      ok: tinyBlogOracleBatchOk,
      script: "pnpm run hub:tiny-blog-oracle-batch-smoke",
    },
    fourOriginDeliveryBatch: {
      ok: fourOriginDeliveryBatchOk,
      script: "pnpm run hub:four-origin-delivery-batch-smoke",
    },
    symfonyDeliveryBatch: {
      ok: symfonyDeliveryBatchOk,
      script: "pnpm run hub:symfony-delivery-batch-smoke",
    },
    laravelMinMigrationOsBatch: {
      ok: laravelMinMigrationOsBatchOk,
      script: "pnpm run hub:laravel-min-migration-os-batch-smoke",
    },
    oracleStandaloneBatch: {
      ok: oracleStandaloneBatchOk,
      script: "pnpm run hub:oracle-standalone-batch-smoke",
    },
    fullDeliveryMegaBatch: {
      ok: fullDeliveryMegaBatchOk,
      script: "pnpm run hub:full-delivery-mega-batch-smoke",
    },
    cwlMegaBatch: {
      ok: cwlMegaBatchOk,
      script: "pnpm run hub:cwl-mega-batch-smoke",
    },
    fullstackAuthoringBatchV2: {
      ok: fullstackAuthoringBatchV2Ok,
      script: "pnpm run hub:cwl-authoring-batch-v2-smoke",
      schemaVersion: fullstackAuthoringBatchV2.schemaVersion ?? 1,
    },
    fullstackAuthoringBatchV3: {
      ok: fullstackAuthoringBatchV3Ok,
      script: "pnpm run hub:cwl-authoring-batch-v3-smoke",
      schemaVersion: fullstackAuthoringBatchV3.schemaVersion ?? 1,
    },
    plainPhpMigrationOsBatch: {
      ok: plainPhpMigrationOsBatchOk,
      script: "pnpm run hub:plain-php-migration-os-batch-smoke",
    },
    tinyBlogDeliveryBatch: {
      ok: tinyBlogDeliveryBatchOk,
      script: "pnpm run hub:tiny-blog-delivery-batch-smoke",
    },
    deliveryPipelineStandaloneBatch: {
      ok: deliveryPipelineStandaloneBatchOk,
      script: "pnpm run hub:delivery-pipeline-standalone-batch-smoke",
    },
    laravelMinOracleBatch: {
      ok: laravelMinOracleBatchOk,
      script: "pnpm run hub:laravel-min-oracle-batch-smoke",
    },
    advisoryStandaloneMegaBatch: {
      ok: advisoryStandaloneMegaBatchOk,
      script: "pnpm run hub:advisory-standalone-mega-batch-smoke",
    },
    allDeliveryUltraMegaBatch: {
      ok: allDeliveryUltraMegaBatchOk,
      script: "pnpm run hub:all-delivery-ultra-mega-batch-smoke",
    },
    migrationOsMegaBatch: {
      ok: migrationOsMegaBatchOk,
      script: "pnpm run hub:migration-os-mega-batch-smoke",
    },
    oracleProductUltraBatch: {
      ok: oracleProductUltraBatchOk,
      schemaVersion: oracleProductUltraBatch.schemaVersion ?? 7,
      script: "pnpm run hub:oracle-product-ultra-batch-smoke",
    },
    expressLaravelMinDeliveryBatch: {
      ok: expressLaravelMinDeliveryBatchOk,
      script: "pnpm run hub:express-laravel-min-delivery-batch-smoke",
    },
    symfonyLaravelMinDeliveryBatch: {
      ok: symfonyLaravelMinDeliveryBatchOk,
      script: "pnpm run hub:symfony-laravel-min-delivery-batch-smoke",
    },
    postTranslateVerifyOriginBatch: {
      ok: postTranslateVerifyOriginBatchOk,
      script: "pnpm run hub:post-translate-verify-origin-batch-smoke",
    },
    tinyBlogDepthBatch: {
      ok: tinyBlogDepthBatchOk,
      script: "pnpm run hub:tiny-blog-depth-batch-smoke",
    },
    contractVerifyStandaloneBatch: {
      ok: contractVerifyStandaloneBatchOk,
      script: "pnpm run hub:contract-verify-standalone-batch-smoke",
    },
    chimeraCutoverOriginBatch: {
      ok: chimeraCutoverOriginBatchOk,
      script: "pnpm run hub:chimera-cutover-origin-batch-smoke",
    },
    migrationAssessmentOriginBatch: {
      ok: migrationAssessmentOriginBatchOk,
      script: "pnpm run hub:migration-assessment-origin-batch-smoke",
    },
    verifyGapsOriginBatch: {
      ok: verifyGapsOriginBatchOk,
      script: "pnpm run hub:verify-gaps-origin-batch-smoke",
    },
    postTranslateArtifactsOriginBatch: {
      ok: postTranslateArtifactsOriginBatchOk,
      script: "pnpm run hub:post-translate-artifacts-origin-batch-smoke",
    },
    verifyStandaloneMegaBatch: {
      ok: verifyStandaloneMegaBatchOk,
      script: "pnpm run hub:verify-standalone-mega-batch-smoke",
    },
    contractStandaloneMegaBatch: {
      ok: contractStandaloneMegaBatchOk,
      script: "pnpm run hub:contract-standalone-mega-batch-smoke",
    },
    evidenceStandaloneMegaBatch: {
      ok: evidenceStandaloneMegaBatchOk,
      schemaVersion: evidenceStandaloneMegaBatch.schemaVersion ?? 5,
      script: "pnpm run hub:evidence-standalone-mega-batch-smoke",
    },
    plainPhpDepthBatch: {
      ok: plainPhpDepthBatchOk,
      script: "pnpm run hub:plain-php-depth-batch-smoke",
    },
    symfonyDepthBatch: {
      ok: symfonyDepthBatchOk,
      script: "pnpm run hub:symfony-depth-batch-smoke",
    },
    expressDepthBatch: {
      ok: expressDepthBatchOk,
      script: "pnpm run hub:express-depth-batch-smoke",
    },
    laravelMinDepthBatch: {
      ok: laravelMinDepthBatchOk,
      script: "pnpm run hub:laravel-min-depth-batch-smoke",
    },
    originDepthUltraBatch: {
      ok: originDepthUltraBatchOk,
      script: "pnpm run hub:origin-depth-ultra-batch-smoke",
    },
    chimeraAssessmentMegaBatch: {
      ok: chimeraAssessmentMegaBatchOk,
      script: "pnpm run hub:chimera-assessment-mega-batch-smoke",
    },
    verifyProductUltraBatch: {
      ok: verifyProductUltraBatchOk,
      schemaVersion: verifyProductUltraBatch.schemaVersion ?? 6,
      script: "pnpm run hub:verify-product-ultra-batch-smoke",
    },
    projectToCwlAllOrigins: {
      ok: projectToCwlAllOriginsOk,
      originCount: projectToCwlAllOrigins.originCount ?? null,
      script: "pnpm run hub:project-to-cwl-all-origins",
    },
    cwlAllOriginsBatch: {
      ok: cwlAllOriginsBatchOk,
      script: "pnpm run hub:cwl-all-origins-batch-smoke",
    },
    cwlAppStackOriginsBatch: {
      ok: cwlAppStackOriginsBatchOk,
      script: "pnpm run hub:cwl-app-stack-origins-batch-smoke",
    },
    cwlAssetOriginsBatch: {
      ok: cwlAssetOriginsBatchOk,
      script: "pnpm run hub:cwl-asset-origins-batch-smoke",
    },
    cwlPatternLiteralCwlBatch: {
      ok: cwlPatternLiteralCwlBatchOk,
      suiteCount: cwlPatternLiteralCwlBatch.suiteCount ?? null,
      script: "pnpm run hub:cwl-pattern-literal-cwl-batch-smoke",
    },
    hubTranslateCwlCoverage: {
      ok: hubTranslateCwlCoverageOk,
      schemaVersion: hubTranslateCwlCoverage.schemaVersion ?? 2,
      originCount: hubTranslateCwlCoverage.originCount ?? null,
      script: "pnpm run hub:translate-cwl-coverage-smoke",
    },
    cwlPatternLiteralRoundtripBatch: {
      ok: cwlPatternLiteralRoundtripBatchOk,
      suiteCount: cwlPatternLiteralRoundtripBatch.suiteCount ?? null,
      script: "pnpm run hub:cwl-pattern-literal-roundtrip-batch-smoke",
    },
    cwlFlagshipRoundtripBatch: {
      ok: cwlFlagshipRoundtripBatchOk,
      suiteCount: cwlFlagshipRoundtripBatch.suiteCount ?? null,
      script: "pnpm run hub:cwl-flagship-roundtrip-batch-smoke",
    },
    hubTranslateCwlRoundtrip: {
      ok: hubTranslateCwlRoundtripOk,
      originCount: hubTranslateCwlRoundtrip.originCount ?? null,
      script: "pnpm run hub:translate-cwl-roundtrip-smoke",
    },
    projectToCwlRoundtrip: {
      ok: projectToCwlRoundtripOk,
      originCount: projectToCwlRoundtrip.originCount ?? null,
      script: "pnpm run hub:project-to-cwl-roundtrip-smoke",
    },
    contractImportCwlRoundtrip: {
      ok: contractImportCwlRoundtripOk,
      script: "pnpm run hub:contract-import-cwl-roundtrip-smoke",
    },
    phpOracleMicroVerifyBatch: {
      ok: phpOracleMicroVerifyBatchOk,
      routeCount: phpOracleMicroVerifyBatch.micro?.routeCount ?? null,
      nextjsCorrectness: phpOracleMicroVerifyBatch.nextjs?.correctness ?? null,
      script: "pnpm run hub:php-oracle-micro-verify-batch-smoke",
    },
    phpNextjsVerifyBatch: {
      ok: phpNextjsVerifyBatchOk,
      wptpEmitNextjsAvailable: phpNextjsVerifyBatch.wptpEmitNextjsAvailable ?? null,
      script: "pnpm run hub:php-nextjs-verify-batch-smoke",
    },
    phpWedgeBatch: {
      ok: phpWedgeBatchOk,
      schemaVersion: phpWedgeBatch.schemaVersion ?? 4,
      script: "pnpm run hub:php-wedge-batch-smoke",
    },
    hubEvidenceMvpBatch: {
      ok: hubEvidenceMvpBatchOk,
      trendPoints: hubEvidenceMvpBatch.trend?.trendPoints ?? null,
      holeCount: hubEvidenceMvpBatch.evidence?.holeCount ?? null,
      pipelineGatePass: hubEvidenceMvpBatch.evidence?.pipelineGatePass ?? null,
      script: "pnpm run hub:evidence-mvp-batch-smoke",
    },
    wptpStrictBatch: {
      ok: wptpStrictBatchOk,
      skip: wptpStrictBatch.skip ?? null,
      wptpEmitNextjsAvailable: wptpStrictBatch.wptpEmitNextjsAvailable ?? null,
      wptpMatrixAvailable: wptpStrictBatch.wptpMatrixAvailable ?? null,
      script: "pnpm run hub:wptp-strict-batch-smoke",
    },
    flagshipFullGapsBatch: {
      ok: flagshipFullGapsBatchOk,
      schemaVersion: flagshipFullGapsBatch.schemaVersion ?? 3,
      backlogCount: flagshipFullGapsBatch.backlogCount ?? null,
      ingestNext: flagshipFullGapsBatch.ingestNext ?? null,
      script: "pnpm run hub:flagship-full-gaps-batch-smoke",
    },
    gapsIngestClosureBatch: {
      ok: gapsIngestClosureBatchOk,
      laravelIngestNext: gapsIngestClosureBatch.laravelClosure?.ingestNext ?? null,
      expressSeeded: gapsIngestClosureBatch.expressSeed?.ok === true,
      script: "pnpm run hub:gaps-ingest-closure-batch-smoke",
    },
    gapsIngestStrictBatch: {
      ok: gapsIngestStrictBatchOk,
      schemaVersion: gapsIngestStrictBatch.schemaVersion ?? 4,
      laravelLiveBacklog: gapsIngestStrictBatch.laravelLiveClosure?.backlogCount ?? null,
      authProbeReingestOk: gapsIngestStrictBatch.authProbeReingest?.ok === true,
      authProbeVerifyClosureOk: gapsIngestStrictBatch.authProbeVerifyClosure?.ok === true,
      authProbeVerifyReplayOk: gapsIngestStrictBatch.authProbeVerifyReplay?.ok === true,
      authProbeVerifyHttpOk: gapsIngestStrictBatch.authProbeVerifyHttp?.ok === true,
      flagshipVerifyReplayOk: gapsIngestStrictBatch.flagshipVerifyReplay?.ok === true,
      flagshipVerifyHttpOk: gapsIngestStrictBatch.flagshipVerifyHttp?.ok === true,
      script: "pnpm run hub:gaps-ingest-strict-batch-smoke",
    },
    laravelAuthProbeReingest: {
      ok: laravelAuthProbeReingestOk,
      schemaVersion: laravelAuthProbeReingest.schemaVersion ?? 3,
      reingestExitCode: laravelAuthProbeReingest.reingest?.exitCode ?? null,
      verifyClosureOk: laravelAuthProbeReingest.verifyClosure?.ok === true,
      verifyReplayOk: laravelAuthProbeReingest.verifyReplay?.ok === true,
      verifyHttpOk: laravelAuthProbeReingest.verifyHttp?.ok === true,
      fixture: laravelAuthProbeReingest.fixture ?? "fixtures/laravel-auth-probe",
      script: "pnpm run hub:laravel-auth-probe-reingest-smoke",
    },
    laravelAuthProbeVerifyClosure: {
      ok: laravelAuthProbeVerifyClosureOk,
      backlogAfter: laravelAuthProbeVerifyClosure.backlogAfter ?? null,
      correctnessAfter: laravelAuthProbeVerifyClosure.correctnessAfter ?? null,
      script: "pnpm run hub:laravel-auth-probe-reingest-verify-closure-smoke",
    },
    laravelAuthProbeVerifyReplay: {
      ok: laravelAuthProbeVerifyReplayOk,
      backlogAfter: laravelAuthProbeVerifyReplay.backlogAfter ?? null,
      correctnessAfter: laravelAuthProbeVerifyReplay.correctnessAfter ?? null,
      script: "pnpm run hub:laravel-auth-probe-reingest-verify-replay-smoke",
    },
    laravelAuthProbeVerifyHttp: {
      ok: laravelAuthProbeVerifyHttpOk,
      backlogAfter: laravelAuthProbeVerifyHttp.backlogAfter ?? null,
      correctnessAfter: laravelAuthProbeVerifyHttp.correctnessAfter ?? null,
      script: "pnpm run hub:laravel-auth-probe-reingest-verify-http-smoke",
    },
    flagshipVerifyReplay: {
      ok: flagshipVerifyReplayOk,
      schemaVersion: flagshipVerifyReplay.schemaVersion ?? 1,
      script: "pnpm run hub:flagship-verify-replay-batch-smoke",
    },
    flagshipVerifyHttp: {
      ok: flagshipVerifyHttpOk,
      schemaVersion: flagshipVerifyHttp.schemaVersion ?? 1,
      script: "pnpm run hub:flagship-verify-http-batch-smoke",
    },
    irHelperLifting: {
      ok: irHelperLiftingOk,
      fixture: irHelperLifting.fixture ?? "fixtures/lift-helper-lift-twin",
      script: "pnpm run hub:ir-helper-lifting-smoke",
    },
    irHelperLiftingSemantic: {
      ok: irHelperLiftingSemanticOk,
      fixture: irHelperLiftingSemantic.fixture ?? "fixtures/lift-helper-gap-probe",
      script: "pnpm run hub:ir-helper-lifting-semantic-smoke",
    },
    irHelperLiftingEmbed: {
      ok: irHelperLiftingEmbedOk,
      fixture: irHelperLiftingEmbed.fixture ?? "fixtures/lift-helper-lift-twin",
      script: "pnpm run hub:ir-helper-lifting-embed-smoke",
    },
    laravelAuthProbeVerifyHttpFastify: {
      ok: laravelAuthProbeVerifyHttpFastifyOk,
      target: laravelAuthProbeVerifyHttpFastify.target ?? "fastify",
      correctness: laravelAuthProbeVerifyHttpFastify.correctness ?? null,
      script: "pnpm run hub:laravel-auth-probe-verify-http-fastify",
    },
    flagshipVerifyHttpFastify: {
      ok: flagshipVerifyHttpFastifyOk,
      schemaVersion: flagshipVerifyHttpFastify.schemaVersion ?? 1,
      target: flagshipVerifyHttpFastify.target ?? "fastify",
      script: "pnpm run hub:flagship-verify-http-fastify-batch-smoke",
    },
    laravelAuthProbeReingestVerifyHttpFastify: {
      ok: laravelAuthProbeReingestVerifyHttpFastifyOk,
      target: "fastify",
      backlogAfter: laravelAuthProbeReingestVerifyHttpFastify.backlogAfter ?? null,
      correctnessAfter: laravelAuthProbeReingestVerifyHttpFastify.correctnessAfter ?? null,
      script: "pnpm run hub:laravel-auth-probe-reingest-verify-http-fastify-smoke",
    },
    irHelperLiftingFullPath: {
      ok: irHelperLiftingFullPathOk,
      fixture: irHelperLiftingFullPath.fixture ?? "fixtures/lift-helper-lift-twin",
      script: "pnpm run hub:ir-helper-lifting-full-path-smoke",
    },
    cwlUniversalMegaBatch: {
      ok: cwlUniversalMegaBatchOk,
      schemaVersion: cwlUniversalMegaBatch.schemaVersion ?? 4,
      script: "pnpm run hub:cwl-universal-mega-batch-smoke",
    },
    cwlBodyRoundtrip: {
      ok: cwlBodyRoundtripOk,
      rfc: "CWL-RFC-0005",
      forwardHoleFree: cwlBodyRoundtrip.forwardProjection?.holeFree ?? null,
      roundHoleFree: cwlBodyRoundtrip.roundProjection?.holeFree ?? null,
      script: "pnpm run hub:cwl-body-roundtrip-smoke",
    },
    contractCwlSmoke: {
      ok: contractCwlSmokeOk,
      script: "pnpm run hub:contract-cwl-smoke",
    },
    nodeOracleSpike: {
      ok: nodeOracleSpikeOk,
      schemaVersion: nodeOracleSpike.parsed.schemaVersion ?? 2,
      script: "pnpm run hub:node-oracle-spike",
    },
    laravelMinSmoke: {
      ok: laravelMinSmokeOk,
      routeCount: laravelMinSmoke.routeCount,
      scaffold: laravelMinSmoke.scaffold,
      script: "pnpm run hub:laravel-min-smoke",
    },
    expressFlagshipGold: {
      ok: expressFlagshipOk,
      routeCount: expressFlagshipReport.lift?.routeCount ?? null,
      suiteIds: [
        "express-flagship-hono",
        "express-flagship-fastify",
        "express-flagship-nextjs",
        "express-flagship-cwl",
      ],
      script: "pnpm run hub:express-flagship",
      cwlProjection: expressFlagshipReport.cwlProjection ?? null,
      emitParity: expressFlagshipReport.emitParity ?? null,
      inProcess: true,
    },
    nodeExpressOracleVerify: {
      ok: nodeExpressOracleOk,
      correctness: nodeExpressOracle.correctness ?? null,
      traceCount: nodeExpressOracle.traceCount ?? null,
      skip: nodeExpressOracle.skip ?? null,
      script: "pnpm run hub:node-express-oracle-verify",
    },
    plainPhpFlagshipGold: {
      ok: plainPhpFlagshipOk,
      routeCount: plainPhpFlagshipReport.ingest?.routeCount ?? null,
      suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-nextjs", "plain-php-flagship-cwl"],
      emitParity: plainPhpFlagshipReport.emitParity ?? null,
      script: "pnpm run hub:plain-php-flagship",
      cwlProjection: plainPhpFlagshipReport.cwlProjection ?? null,
      inProcess: true,
    },
    symfonyFlagshipGold: {
      ok: symfonyFlagshipOk,
      routeCount: symfonyFlagshipReport.ingest?.routeCount ?? null,
      suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-nextjs", "symfony-flagship-cwl"],
      emitParity: symfonyFlagshipReport.emitParity ?? null,
      script: "pnpm run hub:symfony-flagship",
      routesYamlParity: {
        ok: symfonyFlagshipReport.routesParity?.ok ?? false,
        yamlRouteCount: symfonyFlagshipReport.routesParity?.yamlRouteCount ?? null,
        manifestRouteCount: symfonyFlagshipReport.routesParity?.manifestRouteCount ?? null,
        script: "pnpm run hub:symfony-routes",
      },
      routesAttributeParity: {
        ok: symfonyFlagshipReport.routesParity?.attributes?.ok ?? false,
        attributeRouteCount: symfonyFlagshipReport.routesParity?.attributes?.attributeRouteCount ?? null,
      },
      routesNameParity: {
        ok: symfonyFlagshipReport.routesParity?.names?.ok ?? false,
        yamlNameCount: symfonyFlagshipReport.routesParity?.names?.yamlNameCount ?? null,
        attributeNameCount: symfonyFlagshipReport.routesParity?.names?.attributeNameCount ?? null,
      },
      attributePrefixParity: {
        ok: symfonyFlagshipReport.attributePrefixProbe?.ok ?? false,
        routeCount: symfonyFlagshipReport.attributePrefixProbe?.manifestRouteCount ?? null,
        fixture: "fixtures/hub-symfony-attr-prefix",
      },
      attributeMethodsParity: {
        ok: symfonyFlagshipReport.attributeMethodsProbe?.ok ?? false,
        routeCount: symfonyFlagshipReport.attributeMethodsProbe?.manifestRouteCount ?? null,
        fixture: "fixtures/hub-symfony-attr-methods",
      },
      cwlProjection: symfonyFlagshipReport.cwlProjection ?? null,
      inProcess: true,
    },
    phpNextjsVerify: {
      ok: phpNextjsVerifyOk,
      correctness: phpNextjsVerify.correctness ?? null,
      skip: phpNextjsVerify.skip ?? null,
      script: "pnpm run hub:php-nextjs-verify",
    },
    capabilityMatrix: {
      schemaVersion: capabilityMatrix.schemaVersion,
      oracleMicroFixture: capabilityMatrix.oracleMicroFixture?.fixture ?? null,
      nextjsFlagshipFixtures: capabilityMatrix.nextjsFlagshipFixtures ?? [],
      oracleProductPairCount: capabilityMatrix.tiers.oracleProduct.pairCount,
      structuralSuiteCount: capabilityMatrix.tiers.structuralPlumbing.structuralSuiteCount,
      doc: "docs/CAPABILITY-MATRIX.md",
      exportScript: "pnpm run hub:capability-matrix",
    },
    crossFrameworkCwlGold: {
      suiteIds: [
        "java-literal-cwl",
        "go-literal-cwl",
        "csharp-literal-cwl",
        "ruby-literal-cwl",
        "rust-literal-cwl",
        "kotlin-literal-cwl",
        "scala-literal-cwl",
        "swift-literal-cwl",
      ],
    },
    cwlPatternLiteralGold: {
      suiteIds: [
        "vue-literal-cwl",
        "sql-literal-cwl",
        "html-literal-cwl",
        "json-literal-cwl",
        "css-literal-cwl",
        "scss-literal-cwl",
        "markdown-literal-cwl",
        "yaml-literal-cwl",
        "c-literal-cwl",
        "cpp-literal-cwl",
      ],
      roundTripSuiteIds: [
        "js-literal-cwl",
        "ts-literal-cwl",
        "python-literal-cwl",
        "vue-literal-cwl",
        "sql-literal-cwl",
        "html-literal-cwl",
        "json-literal-cwl",
        "css-literal-cwl",
        "scss-literal-cwl",
        "markdown-literal-cwl",
        "yaml-literal-cwl",
        "c-literal-cwl",
        "cpp-literal-cwl",
        "java-literal-cwl",
        "go-literal-cwl",
        "csharp-literal-cwl",
        "ruby-literal-cwl",
        "kotlin-literal-cwl",
        "scala-literal-cwl",
        "swift-literal-cwl",
        "rust-literal-cwl",
      ],
    },
    flagshipCwlRoundtripGold: {
      suiteIds: ["plain-php-flagship-cwl", "symfony-flagship-cwl", "express-flagship-cwl"],
    },
    kssFrameworkGold: {
      suiteIds: [
        "kotlin-literal-hono",
        "kotlin-literal-fastify",
        "kotlin-literal-cwl",
        "scala-literal-hono",
        "scala-literal-fastify",
        "scala-literal-cwl",
        "swift-literal-hono",
        "swift-literal-fastify",
        "swift-literal-cwl",
      ],
    },
    typescriptFamilyNextjsGold: {
      suiteIds: [
        "js-literal-nextjs",
        "ts-literal-nextjs",
        "js-structured-nextjs",
        "ts-structured-nextjs",
      ],
    },
    wptpContractGold: {
      suiteIds: ["contract-first-hono", "contract-first-nextjs"],
      traceReplaySuiteIds: ["contract-first-hono", "contract-first-nextjs"],
    },
    multiLaneSmoke: {
      ok: multiLaneOk,
      schemaVersion: multiLaneReport.schemaVersion ?? 2,
      oracleRedactor: multiLaneReport.oracleRedactor === true,
      parserBridgeVendor: multiLaneReport.parserBridgeVendor === true,
      parserNikicParity: multiLaneReport.parserNikicParity === true,
      parserNikicSkipped: multiLaneReport.parserNikicSkipped ?? null,
      migrationDebtOk: multiLaneReport.migrationDebtOk === true,
      migrationDebtHoleCount: multiLaneReport.migrationDebtHoleCount ?? null,
      phpAvailable: multiLaneReport.phpAvailable === true,
    },
    assetVueNextjsGold: {
      suiteIds: [
        "sql-literal-nextjs",
        "html-literal-nextjs",
        "json-literal-nextjs",
        "vue-literal-nextjs",
      ],
    },
    assetFrameworkGold: {
      suiteIds: [
        "sql-literal-hono",
        "sql-literal-fastify",
        "html-literal-hono",
        "html-literal-fastify",
        "json-literal-hono",
        "json-literal-fastify",
        "vue-literal-hono",
        "vue-literal-fastify",
      ],
    },
    assetExtendedNextjsGold: completionSections.assetExtendedNextjsGold,
    assetExtendedFrameworkGold: completionSections.assetExtendedFrameworkGold,
    phpOracleSmoke: {
      ok: phpOracleOk,
      schemaVersion: phpOracle.parsed.schemaVersion ?? 1,
      oracleMicro: phpOracle.parsed.oracleMicro ?? oracleMicro,
      ingestOk: phpOracle.parsed.ingestOk === true,
      emitHonoOk: phpOracle.parsed.emitHonoOk === true,
      emitFastifyOk: phpOracle.parsed.emitFastifyOk === true,
      emitNextjsOk: phpOracle.parsed.emitNextjsOk === true,
      verifyNextjsOk: phpOracle.parsed.verifyNextjsOk === true,
      verifyNextjsCorrectness: phpOracle.parsed.verifyNextjsCorrectness ?? null,
      nextjsSkipped: phpOracle.parsed.nextjsSkipped ?? null,
      wptpEmitNextjsAvailable: phpOracle.parsed.wptpEmitNextjsAvailable === true,
      emit: phpOracle.parsed.emit ?? {},
      verifyOk: phpOracle.parsed.verifyOk === true,
      routeCount: phpOracle.parsed.routeCount ?? null,
      skipped: phpOracle.parsed.skip ?? null,
      phpAvailable: phpOracle.parsed.phpAvailable === true,
    },
    pathKnowledge: {
      schemaVersion: 3,
      exportScript: "pnpm run hub:path-knowledge",
      webDatabaseCount: webDbCount,
    },
    webDatabaseCatalog: {
      exportScript: "pnpm run hub:web-databases",
      count: webDbCount,
    },
    languageCompareApi: "/api/hub/language-compare",
    migrationPlannerApi: "/api/hub/migration-plan",
    migrationProgramsApi: "/api/hub/migration-program",
    evidenceApi: "/api/hub/projects/{id}/evidence",
    verifyPlaybooksApi: "/api/hub/verify-playbooks",
    databaseDetectApi: "/api/hub/detect-databases",
    knowledgeExport: {
      pathKnowledge: "reports/ci/hub-path-knowledge.json",
      webDatabases: "reports/ci/hub-web-databases.json",
      script: "pnpm run ci:hub-knowledge",
    },
    routeGrades,
    licenseStatus: {
      api: "/api/hub/license-status",
      requireLicense: licenseStatus.requireLicense,
      gatePass: licenseStatus.gatePass,
      tier: licenseStatus.tier,
    },
    generatedAt: new Date().toISOString(),
  };

  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
