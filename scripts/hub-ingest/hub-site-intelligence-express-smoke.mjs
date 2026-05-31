#!/usr/bin/env node
/** Site intelligence smoke on Express flagship (G294). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSmoke } from "./hub-site-intelligence-smoke.mjs";

export const HUB_SITE_INTELLIGENCE_EXPRESS_SMOKE_KIND = "chrysalis.hub.site-intelligence-express-smoke";
export const HUB_SITE_INTELLIGENCE_EXPRESS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expressFixture = join(scriptRoot, "fixtures/hub-flagship-express");

export async function runSiteIntelligenceExpressSmoke() {
  const report = await runSiteIntelligenceSmoke(expressFixture);
  return {
    kind: HUB_SITE_INTELLIGENCE_EXPRESS_SMOKE_KIND,
    schemaVersion: HUB_SITE_INTELLIGENCE_EXPRESS_SMOKE_SCHEMA_VERSION,
    ok:
      (report.primaryOrigin === "javascript" || report.primaryOrigin === "php") &&
      (report.routeCount ?? 0) >= 20,
    routeCount: report.routeCount ?? null,
    primaryOrigin: report.primaryOrigin ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSiteIntelligenceExpressSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
