#!/usr/bin/env node
/** Site intelligence smoke on Laravel-min scaffold (G321). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSmoke } from "./hub-site-intelligence-smoke.mjs";

export const HUB_SITE_INTELLIGENCE_LARAVEL_MIN_SMOKE_KIND = "chrysalis.hub.site-intelligence-laravel-min-smoke";
export const HUB_SITE_INTELLIGENCE_LARAVEL_MIN_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const laravelMinFixture = join(scriptRoot, "flagship/laravel-min");

export async function runSiteIntelligenceLaravelMinSmoke(projectDir = laravelMinFixture) {
  const report = await runSiteIntelligenceSmoke(projectDir);
  return {
    kind: HUB_SITE_INTELLIGENCE_LARAVEL_MIN_SMOKE_KIND,
    schemaVersion: HUB_SITE_INTELLIGENCE_LARAVEL_MIN_SMOKE_SCHEMA_VERSION,
    ok: report.primaryOrigin === "php" && (report.routeCount ?? 0) >= 15,
    routeCount: report.routeCount ?? null,
    primaryOrigin: report.primaryOrigin ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSiteIntelligenceLaravelMinSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
