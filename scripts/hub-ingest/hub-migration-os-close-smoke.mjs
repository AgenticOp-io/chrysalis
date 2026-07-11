#!/usr/bin/env node
/** Migration OS program close — evidence + open legacy + VMF hub + IS live/Cyno substrate (G8550). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationEvidencePocCloseSmoke } from "./hub-migration-evidence-poc-close-smoke.mjs";
import { runSitePortOpenLegacyCloseSmoke } from "./hub-site-port-open-legacy-close-smoke.mjs";
import { runSitePortFederationHubCloseSmoke } from "./hub-site-port-federation-hub-close-smoke.mjs";
import { runIntelligenceShorthandCloseSmoke } from "./hub-intelligence-shorthand-close-smoke.mjs";
import { runIsRuntimeCloseSmoke } from "./hub-is-runtime-close-smoke.mjs";
import { runIsLiveAnalyticsCloseSmoke } from "./hub-is-live-analytics-close-smoke.mjs";
import { runIsNearMissSalienceSmoke } from "./hub-is-near-miss-salience-smoke.mjs";
import { runIsUtilityPriorSmoke } from "./hub-is-utility-prior-smoke.mjs";
import { runConvertGovernorSmoke } from "./hub-convert-governor-smoke.mjs";
import { runConvertAimPersistSmoke } from "./hub-convert-aim-persist-smoke.mjs";
import { runIsEvidenceUsedUtilitySmoke } from "./hub-is-evidence-used-utility-smoke.mjs";
import { runMcpGovernorCoverageSmoke } from "./hub-mcp-governor-coverage-smoke.mjs";
import { runConvertCycleGateSmoke } from "./hub-convert-cycle-gate-smoke.mjs";
import { runDocVsBoxSmoke } from "./hub-doc-vs-box-smoke.mjs";
import { runIsLiveOperatorEvidenceSmoke } from "./hub-is-live-operator-evidence-smoke.mjs";
import { runCwlLanguageMaintenanceSmoke } from "./hub-cwl-language-maintenance-smoke.mjs";
import { runWispShowcaseBoundSmoke } from "./hub-wisp-showcase-bound-smoke.mjs";
import { runGpuLabCloseSmoke } from "./hub-gpu-lab-close-smoke.mjs";
import { runIsNearMissSalienceV2Smoke } from "./hub-is-near-miss-salience-v2-smoke.mjs";
import { runOperatorEvidenceSeedSmoke } from "./hub-operator-evidence-seed-smoke.mjs";
import { runLiveAnalyticsHubSmoke } from "./hub-live-analytics-hub-smoke.mjs";
import { runWispModalShellSmoke } from "./hub-wisp-modal-shell-smoke.mjs";
import { runWispMapShellSmoke } from "./hub-wisp-map-shell-smoke.mjs";
import { runWispNavWizardShellSmoke } from "./hub-wisp-nav-wizard-shell-smoke.mjs";
import { runPublicReportsSmoke } from "./hub-public-reports-smoke.mjs";
import { runWholeSiteCwlCloseSmoke } from "./hub-whole-site-cwl-close-smoke.mjs";
import { runProductHitRateLiveSmoke } from "./hub-product-hit-rate-live-smoke.mjs";
import { runProductHitRateLiveReadySmoke } from "./hub-product-hit-rate-live-ready-smoke.mjs";
import { runOpenLegacyNightlyBuildHub } from "../open-legacy-nightly-build-hub.mjs";
import {
  migrationEvidenceHubNightlyLinked,
  refreshMigrationEvidenceHub,
} from "../migration-evidence-build-hub.mjs";
import { runFullMatrixOracleProgressGate } from "./hub-full-matrix-oracle-progress-smoke.mjs";
import { runExtendedMatrixOracleProgressGate } from "./hub-extended-matrix-oracle-progress-smoke.mjs";
import { isPhase44ProgramClosed } from "./hub-phase44-program-entry-smoke.mjs";
import { isPhase45ProgramActive, isPhase45ProgramClosed } from "./hub-phase45-program-entry-smoke.mjs";

export const HUB_MIGRATION_OS_CLOSE_KIND = "chrysalis.hub.migration-os-close-smoke";
/** v20: G9780 WISP residual settle (coalesce / inequality / nested-each) (D6399). */
export const HUB_MIGRATION_OS_CLOSE_SCHEMA_VERSION = 20;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runMigrationOsCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const evidence = await runMigrationEvidencePocCloseSmoke({ repoRoot });
  const openLegacy = await runSitePortOpenLegacyCloseSmoke();
  const federationHub = await runSitePortFederationHubCloseSmoke();
  const intelligence = await runIntelligenceShorthandCloseSmoke({ repoRoot, skipPort: true });
  const isRuntime = await runIsRuntimeCloseSmoke({ repoRoot });
  const isLiveAnalytics = await runIsLiveAnalyticsCloseSmoke({ repoRoot });
  const isNearMissSalience = await runIsNearMissSalienceSmoke({ repoRoot });
  const isUtilityPrior = await runIsUtilityPriorSmoke({ repoRoot });
  const convertGovernor = await runConvertGovernorSmoke({ repoRoot });
  const convertAimPersist = await runConvertAimPersistSmoke({ repoRoot });
  const isEvidenceUsedUtility = await runIsEvidenceUsedUtilitySmoke({ repoRoot });
  const mcpGovernorCoverage = await runMcpGovernorCoverageSmoke({ repoRoot });
  const convertCycleGate = await runConvertCycleGateSmoke({ repoRoot });
  const docVsBox = await runDocVsBoxSmoke({ repoRoot });
  const isLiveOperatorEvidence = await runIsLiveOperatorEvidenceSmoke({ repoRoot });

  const skipCwlMaintenance =
    opts.skipCwlMaintenance === true || process.env.CHRYSALIS_MIGRATION_OS_SKIP_CWL_MAINTENANCE === "1";
  const cwlLanguageMaintenance = skipCwlMaintenance
    ? { ok: true, skip: "cwl-maintenance-skipped", kind: "chrysalis.cwl-language-maintenance-smoke" }
    : await runCwlLanguageMaintenanceSmoke({ repoRoot });

  const wispShowcaseBound = await runWispShowcaseBoundSmoke({ repoRoot });
  const gpuLabClose = await runGpuLabCloseSmoke({ repoRoot });
  const operatorEvidenceSeed = await runOperatorEvidenceSeedSmoke({ repoRoot });
  const isNearMissSalienceV2 = await runIsNearMissSalienceV2Smoke({ repoRoot });
  const liveAnalyticsHub = await runLiveAnalyticsHubSmoke({ repoRoot });
  const wispModalShell = await runWispModalShellSmoke({ repoRoot });
  const wispMapShell = await runWispMapShellSmoke({ repoRoot });
  const wispNavWizardShell = await runWispNavWizardShellSmoke({ repoRoot });
  const publicReports = await runPublicReportsSmoke({ repoRoot });
  const productHitRateLive = await runProductHitRateLiveSmoke({ repoRoot, skipSeed: true });
  const productHitRateLiveReady = await runProductHitRateLiveReadySmoke({ repoRoot });

  const skipSlowRegression =
    opts.skipSlowRegression === true || process.env.CHRYSALIS_MIGRATION_OS_SKIP_SLOW_REGRESSION === "1";
  const wholeSiteCwl = skipSlowRegression
    ? { ok: true, skip: "whole-site-cwl-skipped" }
    : await runWholeSiteCwlCloseSmoke({ repoRoot });
  const extendedMatrixCensus = skipSlowRegression
    ? { ok: true, skip: "extended-matrix-skipped" }
    : runExtendedMatrixOracleProgressGate();

  const nightlyJson = join(repoRoot, "reports/open-legacy-index/nightly/latest.json");
  if (existsSync(nightlyJson)) {
    runOpenLegacyNightlyBuildHub({ repoRoot });
  }

  const evidenceHub = await refreshMigrationEvidenceHub({
    repoRoot,
    demoState: evidence.demo,
  });

  const matrixOracle = runFullMatrixOracleProgressGate();
  const extendedMatrix = runExtendedMatrixOracleProgressGate();
  const phase44Closed = isPhase44ProgramClosed();
  const phase45Extended = isPhase45ProgramActive() || isPhase45ProgramClosed();
  const minExtendedOracle = phase45Extended ? 178 : phase44Closed ? 169 : 72;

  const checks = {
    evidenceOk: evidence.ok === true,
    openLegacyOk: openLegacy.ok === true,
    openLegacyWedgeOk: openLegacy.wedge?.ok === true,
    cwlLanguageMaintenanceOk: cwlLanguageMaintenance.ok === true,
    wispShowcaseBoundOk: wispShowcaseBound.ok === true,
    gpuLabCloseOk: gpuLabClose.ok === true,
    isNearMissSalienceV2Ok: isNearMissSalienceV2.ok === true,
    operatorEvidenceSeedOk: operatorEvidenceSeed.ok === true,
    liveAnalyticsHubOk: liveAnalyticsHub.ok === true,
    wispModalShellOk: wispModalShell.ok === true,
    wispMapShellOk: wispMapShell.ok === true,
    wispNavWizardShellOk: wispNavWizardShell.ok === true,
    publicReportsOk: publicReports.ok === true,
    productHitRateLiveOk: productHitRateLive.ok === true,
    productHitRateLiveReadyOk: productHitRateLiveReady.ok === true,
    wholeSiteCwlOk: wholeSiteCwl.ok === true,
    extendedMatrixCensusOk: extendedMatrixCensus.ok === true,
    federationHubOk: federationHub.ok === true,
    intelligenceOk: intelligence.ok === true,
    isRuntimeOk: isRuntime.ok === true,
    isLiveAnalyticsOk: isLiveAnalytics.ok === true,
    isNearMissSalienceOk: isNearMissSalience.ok === true,
    isUtilityPriorOk: isUtilityPrior.ok === true,
    convertGovernorOk: convertGovernor.ok === true,
    convertAimPersistOk: convertAimPersist.ok === true,
    isEvidenceUsedUtilityOk: isEvidenceUsedUtility.ok === true,
    mcpGovernorCoverageOk: mcpGovernorCoverage.ok === true,
    convertCycleGateOk: convertCycleGate.ok === true,
    docVsBoxOk: docVsBox.ok === true,
    isLiveOperatorEvidenceOk: isLiveOperatorEvidence.ok === true,
    evidenceHubRefreshed: evidenceHub.ok === true,
    evidenceHubNightlyLinked: migrationEvidenceHubNightlyLinked(repoRoot),
    matrixOracleOk: matrixOracle.ok === true,
    matrixOracleProgramComplete: matrixOracle.programComplete === true,
    matrixOracleProductCount: phase44Closed || phase45Extended
      ? (extendedMatrix.oracleProductCount ?? 0) >= minExtendedOracle
      : matrixOracle.oracleProductCount === 72,
    extendedMatrixOk: phase44Closed || phase45Extended ? extendedMatrix.ok === true : true,
    extendedOracleProductCount: phase44Closed || phase45Extended ? extendedMatrix.oracleProductCount ?? 0 : null,
    bundleExists: existsSync(join(repoRoot, "reports/federation/bundle/open-legacy-bundle.v1.json")),
    shorthandExists: existsSync(join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json")),
    shorthandHubExists: existsSync(join(repoRoot, "reports/web-llm/shorthand/poc/index.html")),
    nightlyExists: existsSync(join(repoRoot, "reports/open-legacy-index/nightly/latest.json")),
    nightlyHubExists: existsSync(join(repoRoot, "reports/open-legacy-index/nightly/index.html")),
    leagueExists: existsSync(join(repoRoot, "reports/federation/league/index.html")),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_MIGRATION_OS_CLOSE_KIND,
    schemaVersion: HUB_MIGRATION_OS_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    evidence,
    openLegacy,
    federationHub,
    intelligence,
    isRuntime,
    isLiveAnalytics,
    isNearMissSalience,
    isUtilityPrior,
    convertGovernor,
    convertAimPersist,
    isEvidenceUsedUtility,
    mcpGovernorCoverage,
    convertCycleGate,
    docVsBox,
    isLiveOperatorEvidence,
    cwlLanguageMaintenance,
    wispShowcaseBound,
    gpuLabClose,
    isNearMissSalienceV2,
    operatorEvidenceSeed,
    liveAnalyticsHub,
    wispModalShell,
    wispMapShell,
    wispNavWizardShell,
    publicReports,
    productHitRateLive,
    productHitRateLiveReady,
    wholeSiteCwl,
    extendedMatrixCensus,
    evidenceHub,
    matrixOracle,
    extendedMatrix,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationOsCloseSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
