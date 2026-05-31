#!/usr/bin/env node
/** Express depth batch: site intel + path advice + project-to-CWL (G420). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceExpressSmoke } from "./hub-site-intelligence-express-smoke.mjs";
import { runPathAdviceExpressSmoke } from "./hub-path-advice-express-smoke.mjs";
import { runProjectToCwlExpressSmoke } from "./hub-project-to-cwl-express-smoke.mjs";

export const HUB_EXPRESS_DEPTH_BATCH_KIND = "chrysalis.hub.express-depth-batch-smoke";
export const HUB_EXPRESS_DEPTH_BATCH_SCHEMA_VERSION = 1;

export async function runExpressDepthBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceExpressSmoke();
  const pathAdvice = await runPathAdviceExpressSmoke();
  const projectToCwl = await runProjectToCwlExpressSmoke();
  return {
    kind: HUB_EXPRESS_DEPTH_BATCH_KIND,
    schemaVersion: HUB_EXPRESS_DEPTH_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && projectToCwl.ok,
    siteIntelligence,
    pathAdvice,
    projectToCwl,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runExpressDepthBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
