#!/usr/bin/env node
/** Laravel-min delivery standalone batch smoke (G327). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceLaravelMinSmoke } from "./hub-site-intelligence-laravel-min-smoke.mjs";
import { runPathAdviceLaravelMinSmoke } from "./hub-path-advice-laravel-min-smoke.mjs";
import { runMigrationAssessmentLaravelMinSmoke } from "./hub-migration-assessment-laravel-min-smoke.mjs";
import { runChimeraCutoverLaravelMinSmoke } from "./hub-chimera-cutover-laravel-min-smoke.mjs";

export const HUB_LARAVEL_MIN_DELIVERY_BATCH_KIND = "chrysalis.hub.laravel-min-delivery-batch-smoke";
export const HUB_LARAVEL_MIN_DELIVERY_BATCH_SCHEMA_VERSION = 1;

export async function runLaravelMinDeliveryBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceLaravelMinSmoke();
  const pathAdvice = await runPathAdviceLaravelMinSmoke();
  const migrationAssessment = await runMigrationAssessmentLaravelMinSmoke();
  const chimeraCutover = await runChimeraCutoverLaravelMinSmoke();
  return {
    kind: HUB_LARAVEL_MIN_DELIVERY_BATCH_KIND,
    schemaVersion: HUB_LARAVEL_MIN_DELIVERY_BATCH_SCHEMA_VERSION,
    ok: siteIntelligence.ok && pathAdvice.ok && migrationAssessment.ok && chimeraCutover.ok,
    siteIntelligence,
    pathAdvice,
    migrationAssessment,
    chimeraCutover,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLaravelMinDeliveryBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
