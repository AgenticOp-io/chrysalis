#!/usr/bin/env node
/** Open Legacy Index nightly verify matrix + federation publish (G8510 v2). */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  exportOpenLegacyBundle,
  openLegacyIndexEntries,
  publishFederationArtifacts,
} from "../site-port-federation-lib.mjs";
import { runSitePortVerifyMatrixSmoke } from "./hub-site-port-verify-matrix-smoke.mjs";

export const HUB_SITE_PORT_OPEN_LEGACY_NIGHTLY_KIND = "chrysalis.hub.site-port-open-legacy-nightly-smoke";
export const HUB_SITE_PORT_OPEN_LEGACY_NIGHTLY_SCHEMA_VERSION = 2;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} [opts]
 */
export async function runSitePortOpenLegacyNightlySmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const entries = openLegacyIndexEntries(repoRoot);
  const matrix = await runSitePortVerifyMatrixSmoke({ repoRoot });
  const publish = await publishFederationArtifacts(repoRoot);

  const results = matrix.results ?? [];
  const allGreen = entries.every((e) => results.find((r) => r.id === e.id)?.ok === true);

  const report = {
    kind: HUB_SITE_PORT_OPEN_LEGACY_NIGHTLY_KIND,
    schemaVersion: HUB_SITE_PORT_OPEN_LEGACY_NIGHTLY_SCHEMA_VERSION,
    ok:
      matrix.ok === true &&
      allGreen &&
      results.length === entries.length &&
      publish.ok === true,
    indexEntryCount: entries.length,
    fixtureCount: matrix.fixtureCount ?? 0,
    allGreen,
    matrix,
    publish,
    bundlePath: publish.bundle?.outPath ?? null,
    leaguePath: publish.league?.htmlPath ?? null,
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(repoRoot, "reports/open-legacy-index/nightly");
  mkdirSync(outDir, { recursive: true });
  const latestPath = join(outDir, "latest.json");
  writeFileSync(latestPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (!existsSync(join(repoRoot, "reports/federation/bundle/open-legacy-bundle.v1.json"))) {
    exportOpenLegacyBundle(repoRoot);
  }

  return { ...report, latestPath };
}

async function main() {
  const report = await runSitePortOpenLegacyNightlySmoke();
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
