#!/usr/bin/env node
/** Migration OS program close — evidence + open legacy + VMF hub (G8550). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationEvidencePocCloseSmoke } from "./hub-migration-evidence-poc-close-smoke.mjs";
import { runSitePortOpenLegacyCloseSmoke } from "./hub-site-port-open-legacy-close-smoke.mjs";
import { runSitePortFederationHubCloseSmoke } from "./hub-site-port-federation-hub-close-smoke.mjs";
import { runIntelligenceShorthandCloseSmoke } from "./hub-intelligence-shorthand-close-smoke.mjs";
import { runIsRuntimeCloseSmoke } from "./hub-is-runtime-close-smoke.mjs";
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
export const HUB_MIGRATION_OS_CLOSE_SCHEMA_VERSION = 5;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runMigrationOsCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const evidence = await runMigrationEvidencePocCloseSmoke({ repoRoot });
  const openLegacy = await runSitePortOpenLegacyCloseSmoke();
  const federationHub = await runSitePortFederationHubCloseSmoke();
  const intelligence = await runIntelligenceShorthandCloseSmoke({ repoRoot, skipPort: true });
  const isRuntime = await runIsRuntimeCloseSmoke({ repoRoot });

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
    federationHubOk: federationHub.ok === true,
    intelligenceOk: intelligence.ok === true,
    isRuntimeOk: isRuntime.ok === true,
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
