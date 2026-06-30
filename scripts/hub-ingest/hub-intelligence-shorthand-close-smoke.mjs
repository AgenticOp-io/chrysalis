#!/usr/bin/env node
/** Intelligence Shorthand program close (G8560) — CPU only, no GPU spend. */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportIntelligenceShorthands } from "../web-llm-export-shorthand.mjs";
import { runWebLlmBuildShorthandHub } from "../web-llm-build-shorthand-hub.mjs";
import { runSitePortToCwl } from "../site-port-to-cwl.mjs";
import { expectedOpenLegacyIndexCount, openLegacyIndexEntries } from "../site-port-federation-lib.mjs";

export const HUB_INTELLIGENCE_SHORTHAND_CLOSE_KIND = "chrysalis.hub.intelligence-shorthand-close-smoke";
export const HUB_INTELLIGENCE_SHORTHAND_CLOSE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} [opts]
 */
export async function runIntelligenceShorthandCloseSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const skipPort = opts.skipPort === true || process.env.CHRYSALIS_IS_SKIP_PORT === "1";
  const entries = openLegacyIndexEntries(repoRoot);
  const expectedCount = expectedOpenLegacyIndexCount(repoRoot);

  /** @type {Array<{ id: string, portOk: boolean, hadReport: boolean }>} */
  const ports = [];
  if (!skipPort) {
    for (const entry of entries) {
      const projectDir = join(repoRoot, entry.fixtureRel);
      const portPath = join(projectDir, ".chrysalis", "site-port.json");
      const hadReport = existsSync(portPath);
      if (hadReport) {
        ports.push({ id: entry.id, portOk: true, hadReport: true });
        continue;
      }
      if (!existsSync(projectDir)) {
        ports.push({ id: entry.id, portOk: false, hadReport: false });
        continue;
      }
      const port = await runSitePortToCwl({
        projectDir,
        repoRoot,
        origin: entry.origin,
        minRoutes: entry.minRoutes,
        verify: true,
        exportDataset: true,
      });
      ports.push({ id: entry.id, portOk: port.ok === true, hadReport: false });
    }
  }

  const exported = await exportIntelligenceShorthands({ repoRoot });
  const hub = await runWebLlmBuildShorthandHub({ repoRoot });

  const summary = exported.summary ?? {};
  const byTier = summary.byTier ?? {};
  const checks = {
    portsGreen: skipPort || ports.every((p) => p.portOk === true),
    exportOk: exported.ok === true,
    countMin: (exported.count ?? 0) >= expectedCount * 2,
    t4PerIndex: (byTier["IS-T4-policy-graph"] ?? 0) >= expectedCount,
    t5PerIndex: (byTier["IS-T5-oracle-ref"] ?? 0) >= expectedCount,
    totalBytesSmall: (summary.totalBytes ?? 0) < 2_000_000,
    compressionOrders: (summary.compressionVs7BTotal ?? 0) >= 10_000,
    hubOk: hub.ok === true,
    hubExists: existsSync(hub.indexPath ?? ""),
    bundleExists: existsSync(exported.jsonPath ?? ""),
    federationCopyExists: existsSync(exported.federationPath ?? ""),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_INTELLIGENCE_SHORTHAND_CLOSE_KIND,
    schemaVersion: HUB_INTELLIGENCE_SHORTHAND_CLOSE_SCHEMA_VERSION,
    ok,
    checks,
    expectedCount,
    ports,
    exported,
    hub,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runIntelligenceShorthandCloseSmoke();
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
