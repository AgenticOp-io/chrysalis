#!/usr/bin/env node
/** Open Legacy Index close gate — index-driven (G8490/G8500). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  expectedOpenLegacyIndexCount,
  loadOpenLegacyIndex,
  openLegacyIndexEntries,
} from "../site-port-federation-lib.mjs";
import { runSitePortVerifyMatrixSmoke } from "./hub-site-port-verify-matrix-smoke.mjs";
import { runSitePortFederationRegistrySmoke } from "./hub-site-port-federation-registry-smoke.mjs";

export const HUB_SITE_PORT_OPEN_LEGACY_INDEX_CLOSE_KIND = "chrysalis.hub.site-port-open-legacy-index-close-smoke";
export const HUB_SITE_PORT_OPEN_LEGACY_INDEX_CLOSE_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} [opts]
 */
export async function runSitePortOpenLegacyIndexCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const entries = openLegacyIndexEntries(repoRoot);
  const expectedCount = expectedOpenLegacyIndexCount(repoRoot);
  const origins = new Set(entries.map((e) => e.origin));
  const indexIds = entries.map((e) => e.id);
  const registry = await runSitePortFederationRegistrySmoke({ repoRoot });
  const matrix = await runSitePortVerifyMatrixSmoke({ repoRoot });

  const matrixById = new Map((matrix.results ?? []).map((r) => [r.id, r]));
  const allMatrixGreen = entries.every((e) => matrixById.get(e.id)?.ok === true);

  const checks = {
    indexEntryCount: entries.length >= 5,
    indexMatchesExpected: entries.length === expectedCount,
    hasPhpOrigin: origins.has("php"),
    hasJavascriptOrigin: origins.has("javascript"),
    allIndexInMatrix: indexIds.every((id) => matrixById.has(id)),
    registryOk: registry.ok === true,
    matrixOk: matrix.ok === true,
    matrixFixtureCount: (matrix.fixtureCount ?? 0) === expectedCount,
    allMatrixGreen,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_SITE_PORT_OPEN_LEGACY_INDEX_CLOSE_KIND,
    schemaVersion: HUB_SITE_PORT_OPEN_LEGACY_INDEX_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    indexIds,
    origins: [...origins],
    expectedCount,
    registry,
    matrix,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortOpenLegacyIndexCloseSmoke();
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
