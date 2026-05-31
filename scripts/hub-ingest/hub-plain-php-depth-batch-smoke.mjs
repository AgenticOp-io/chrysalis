#!/usr/bin/env node
/** Plain-php depth batch: site intel + path advice + project-to-CWL (G418). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSmoke } from "./hub-site-intelligence-smoke.mjs";
import { runPathAdviceSmoke } from "./hub-path-advice-smoke.mjs";
import { runProjectToCwlPlainPhpSmoke } from "./hub-project-to-cwl-plain-php-smoke.mjs";

export const HUB_PLAIN_PHP_DEPTH_BATCH_KIND = "chrysalis.hub.plain-php-depth-batch-smoke";
export const HUB_PLAIN_PHP_DEPTH_BATCH_SCHEMA_VERSION = 1;

export async function runPlainPhpDepthBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceSmoke();
  const pathAdvice = await runPathAdviceSmoke();
  const projectToCwl = await runProjectToCwlPlainPhpSmoke();
  return {
    kind: HUB_PLAIN_PHP_DEPTH_BATCH_KIND,
    schemaVersion: HUB_PLAIN_PHP_DEPTH_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && projectToCwl.ok,
    siteIntelligence,
    pathAdvice,
    projectToCwl,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPlainPhpDepthBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
