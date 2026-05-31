#!/usr/bin/env node
/** Symfony depth batch: site intel + path advice + project-to-CWL (G419). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSymfonySmoke } from "./hub-site-intelligence-symfony-smoke.mjs";
import { runPathAdviceSymfonySmoke } from "./hub-path-advice-symfony-smoke.mjs";
import { runProjectToCwlSymfonySmoke } from "./hub-project-to-cwl-symfony-smoke.mjs";

export const HUB_SYMFONY_DEPTH_BATCH_KIND = "chrysalis.hub.symfony-depth-batch-smoke";
export const HUB_SYMFONY_DEPTH_BATCH_SCHEMA_VERSION = 1;

export async function runSymfonyDepthBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceSymfonySmoke();
  const pathAdvice = await runPathAdviceSymfonySmoke();
  const projectToCwl = await runProjectToCwlSymfonySmoke();
  return {
    kind: HUB_SYMFONY_DEPTH_BATCH_KIND,
    schemaVersion: HUB_SYMFONY_DEPTH_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && projectToCwl.ok,
    siteIntelligence,
    pathAdvice,
    projectToCwl,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSymfonyDepthBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
