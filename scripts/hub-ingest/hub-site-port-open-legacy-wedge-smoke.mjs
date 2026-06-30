#!/usr/bin/env node
/** Open Legacy Index 7th wedge — WordPress vertical probe (G8570). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expectedOpenLegacyIndexCount, loadOpenLegacyIndex } from "../site-port-federation-lib.mjs";
import { runSitePortToCwl } from "../site-port-to-cwl.mjs";

export const HUB_SITE_PORT_OPEN_LEGACY_WEDGE_KIND = "chrysalis.hub.site-port-open-legacy-wedge-smoke";
export const HUB_SITE_PORT_OPEN_LEGACY_WEDGE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEDGE_ID = "wordpressProbe";

/**
 * @param {object} [opts]
 */
export async function runSitePortOpenLegacyWedgeSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const index = loadOpenLegacyIndex(repoRoot);
  const expectedCount = expectedOpenLegacyIndexCount(repoRoot);
  const entry = (index.entries ?? []).find((e) => e.id === WEDGE_ID);
  if (!entry) {
    return {
      kind: HUB_SITE_PORT_OPEN_LEGACY_WEDGE_KIND,
      schemaVersion: HUB_SITE_PORT_OPEN_LEGACY_WEDGE_SCHEMA_VERSION,
      ok: false,
      skip: "missing-index-entry",
      wedgeId: WEDGE_ID,
      generatedAt: new Date().toISOString(),
    };
  }

  const projectDir = join(repoRoot, entry.fixtureRel);
  const port = existsSync(projectDir)
    ? await runSitePortToCwl({
        projectDir,
        repoRoot,
        origin: entry.origin,
        minRoutes: entry.minRoutes,
        verify: true,
        verifyTarget: "hono",
        exportDataset: true,
      })
    : { ok: false, skip: "missing-fixture" };

  const checks = {
    indexEntryCount: (index.entries ?? []).length >= expectedCount,
    wedgePresent: entry.id === WEDGE_ID,
    portOk: port.ok === true,
    verifyOk: port.verify?.ok === true,
    correctnessMin: (port.verify?.correctness ?? 0) >= 1,
    routeCountMin: (port.cwl?.routeCount ?? 0) >= entry.minRoutes,
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: HUB_SITE_PORT_OPEN_LEGACY_WEDGE_KIND,
    schemaVersion: HUB_SITE_PORT_OPEN_LEGACY_WEDGE_SCHEMA_VERSION,
    ok,
    checks,
    wedgeId: WEDGE_ID,
    expectedCount,
    port: {
      ok: port.ok === true,
      routeCount: port.cwl?.routeCount ?? null,
      correctness: port.verify?.correctness ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSitePortOpenLegacyWedgeSmoke();
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
