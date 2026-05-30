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
  const expressFlagship = runJson(join(scriptRoot, "scripts/hub-ingest/hub-express-flagship.mjs"), []);
  const expressFlagshipOk = expressFlagship.status === 0 && expressFlagship.parsed.ok === true;
  const plainPhpFlagship = runJson(join(scriptRoot, "scripts/hub-ingest/hub-plain-php-flagship.mjs"), []);
  const plainPhpFlagshipOk = plainPhpFlagship.status === 0 && plainPhpFlagship.parsed.ok === true;
  const symfonyFlagship = runJson(join(scriptRoot, "scripts/hub-ingest/hub-symfony-flagship.mjs"), []);
  const symfonyFlagshipOk = symfonyFlagship.status === 0 && symfonyFlagship.parsed.ok === true;
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
    laravelVerifyLiveOk &&
    expressFlagshipOk &&
    nodeExpressOracleOk &&
    plainPhpFlagshipOk &&
    symfonyFlagshipOk &&
    laravelMinSmokeOk;

  const licenseStatus = await buildHubLicenseStatusReport();

  const report = {
    kind: "chrysalis.hub.completion",
    schemaVersion: 48,
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
      schemaVersion: 5,
      failOnIngestGapsEnv: "CHRYSALIS_HUB_EVIDENCE_FAIL_ON_INGEST_GAPS",
      pipelineGateStrictEnv: "CHRYSALIS_HUB_PIPELINE_GATE_STRICT",
      requireWptpNextjsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_WPTP_NEXTJS",
      requireMigrationOsEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_MIGRATION_OS",
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
      routeCount: expressFlagship.parsed.lift?.routeCount ?? null,
      suiteIds: [
        "express-flagship-hono",
        "express-flagship-fastify",
        "express-flagship-nextjs",
        "express-flagship-cwl",
      ],
      script: "pnpm run hub:express-flagship",
      cwlProjection: expressFlagship.parsed.cwlProjection ?? null,
      emitParity: expressFlagship.parsed.emitParity ?? null,
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
      routeCount: plainPhpFlagship.parsed.ingest?.routeCount ?? null,
      suiteIds: ["plain-php-flagship-hono", "plain-php-flagship-fastify", "plain-php-flagship-nextjs", "plain-php-flagship-cwl"],
      emitParity: plainPhpFlagship.parsed.emitParity ?? null,
      script: "pnpm run hub:plain-php-flagship",
      cwlProjection: plainPhpFlagship.parsed.cwlProjection ?? null,
    },
    symfonyFlagshipGold: {
      ok: symfonyFlagshipOk,
      routeCount: symfonyFlagship.parsed.ingest?.routeCount ?? null,
      suiteIds: ["symfony-flagship-hono", "symfony-flagship-fastify", "symfony-flagship-nextjs", "symfony-flagship-cwl"],
      emitParity: symfonyFlagship.parsed.emitParity ?? null,
      script: "pnpm run hub:symfony-flagship",
      routesYamlParity: {
        ok: symfonyFlagship.parsed.routesParity?.ok ?? false,
        yamlRouteCount: symfonyFlagship.parsed.routesParity?.yamlRouteCount ?? null,
        manifestRouteCount: symfonyFlagship.parsed.routesParity?.manifestRouteCount ?? null,
        script: "pnpm run hub:symfony-routes",
      },
      routesAttributeParity: {
        ok: symfonyFlagship.parsed.routesParity?.attributes?.ok ?? false,
        attributeRouteCount: symfonyFlagship.parsed.routesParity?.attributes?.attributeRouteCount ?? null,
      },
      routesNameParity: {
        ok: symfonyFlagship.parsed.routesParity?.names?.ok ?? false,
        yamlNameCount: symfonyFlagship.parsed.routesParity?.names?.yamlNameCount ?? null,
        attributeNameCount: symfonyFlagship.parsed.routesParity?.names?.attributeNameCount ?? null,
      },
      attributePrefixParity: {
        ok: symfonyFlagship.parsed.attributePrefixProbe?.ok ?? false,
        routeCount: symfonyFlagship.parsed.attributePrefixProbe?.manifestRouteCount ?? null,
        fixture: "fixtures/hub-symfony-attr-prefix",
      },
      attributeMethodsParity: {
        ok: symfonyFlagship.parsed.attributeMethodsProbe?.ok ?? false,
        routeCount: symfonyFlagship.parsed.attributeMethodsProbe?.manifestRouteCount ?? null,
        fixture: "fixtures/hub-symfony-attr-methods",
      },
      cwlProjection: symfonyFlagship.parsed.cwlProjection ?? null,
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
      ],
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
