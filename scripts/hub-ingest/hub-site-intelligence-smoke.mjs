#!/usr/bin/env node
/** Site intelligence standalone smoke (G266). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteIntelligenceReport } from "./hub-site-intelligence.mjs";

export const HUB_SITE_INTELLIGENCE_SMOKE_KIND = "chrysalis.hub.site-intelligence-smoke";
export const HUB_SITE_INTELLIGENCE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runSiteIntelligenceSmoke(projectDir = defaultFixture) {
  const report = await buildSiteIntelligenceReport(resolve(projectDir));
  return {
    kind: HUB_SITE_INTELLIGENCE_SMOKE_KIND,
    schemaVersion: HUB_SITE_INTELLIGENCE_SMOKE_SCHEMA_VERSION,
    ok: report.primaryOrigin === "php" && (report.routeEstimate?.count ?? 0) >= 20,
    primaryOrigin: report.primaryOrigin ?? null,
    routeCount: report.routeEstimate?.count ?? null,
    frameworkHints: report.frameworkHints ?? [],
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSiteIntelligenceSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
