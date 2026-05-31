#!/usr/bin/env node
/** Express delivery standalone batch smoke (G306/G308). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceExpressSmoke } from "./hub-site-intelligence-express-smoke.mjs";
import { runPathAdviceExpressSmoke } from "./hub-path-advice-express-smoke.mjs";
import { runMigrationAssessmentExpressSmoke } from "./hub-migration-assessment-express-smoke.mjs";
import { runChimeraCutoverExpressSmoke } from "./hub-chimera-cutover-express-smoke.mjs";

export const HUB_EXPRESS_DELIVERY_BATCH_KIND = "chrysalis.hub.express-delivery-batch-smoke";
export const HUB_EXPRESS_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runExpressDeliveryBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceExpressSmoke();
  const pathAdvice = await runPathAdviceExpressSmoke();
  const migrationAssessment = await runMigrationAssessmentExpressSmoke();
  const chimeraCutover = await runChimeraCutoverExpressSmoke();
  return {
    kind: HUB_EXPRESS_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_EXPRESS_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && migrationAssessment.ok && chimeraCutover.ok,
    siteIntelligence,
    pathAdvice,
    migrationAssessment,
    chimeraCutover,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runExpressDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
