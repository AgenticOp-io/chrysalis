#!/usr/bin/env node
/** Site intelligence smoke on tiny-blog fixture (G396). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteIntelligenceReport } from "./hub-site-intelligence.mjs";

export const HUB_SITE_INTELLIGENCE_TINY_BLOG_SMOKE_KIND = "chrysalis.hub.site-intelligence-tiny-blog-smoke";
export const HUB_SITE_INTELLIGENCE_TINY_BLOG_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tinyBlogFixture = join(scriptRoot, "fixtures/tiny-blog");

export async function runSiteIntelligenceTinyBlogSmoke(projectDir = tinyBlogFixture) {
  const report = await buildSiteIntelligenceReport(resolve(projectDir));
  return {
    kind: HUB_SITE_INTELLIGENCE_TINY_BLOG_SMOKE_KIND,
    schemaVersion: HUB_SITE_INTELLIGENCE_TINY_BLOG_SMOKE_SCHEMA_VERSION,
    ok: report.primaryOrigin === "php" && (report.routeEstimate?.count ?? 0) >= 5,
    routeCount: report.routeEstimate?.count ?? null,
    primaryOrigin: report.primaryOrigin ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSiteIntelligenceTinyBlogSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
