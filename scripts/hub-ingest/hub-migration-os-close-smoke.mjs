#!/usr/bin/env node
/** Migration OS program close — evidence + open legacy + VMF hub (G8550). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationEvidencePocCloseSmoke } from "./hub-migration-evidence-poc-close-smoke.mjs";
import { runSitePortOpenLegacyCloseSmoke } from "./hub-site-port-open-legacy-close-smoke.mjs";
import { runSitePortFederationHubCloseSmoke } from "./hub-site-port-federation-hub-close-smoke.mjs";
import { runIntelligenceShorthandCloseSmoke } from "./hub-intelligence-shorthand-close-smoke.mjs";

export const HUB_MIGRATION_OS_CLOSE_KIND = "chrysalis.hub.migration-os-close-smoke";
export const HUB_MIGRATION_OS_CLOSE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runMigrationOsCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const evidence = await runMigrationEvidencePocCloseSmoke({ repoRoot });
  const openLegacy = await runSitePortOpenLegacyCloseSmoke();
  const federationHub = await runSitePortFederationHubCloseSmoke();
  const intelligence = await runIntelligenceShorthandCloseSmoke({ repoRoot, skipPort: true });

  const checks = {
    evidenceOk: evidence.ok === true,
    openLegacyOk: openLegacy.ok === true,
    federationHubOk: federationHub.ok === true,
    intelligenceOk: intelligence.ok === true,
    bundleExists: existsSync(join(repoRoot, "reports/federation/bundle/open-legacy-bundle.v1.json")),
    shorthandExists: existsSync(join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json")),
    shorthandHubExists: existsSync(join(repoRoot, "reports/web-llm/shorthand/poc/index.html")),
    nightlyExists: existsSync(join(repoRoot, "reports/open-legacy-index/nightly/latest.json")),
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
