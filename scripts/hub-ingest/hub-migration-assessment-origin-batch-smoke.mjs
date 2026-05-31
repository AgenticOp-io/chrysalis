#!/usr/bin/env node
/** Migration assessment origin batch: plain-php + symfony + express + Laravel-min (G412). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationAssessmentSmoke } from "./hub-migration-assessment-smoke.mjs";
import { runMigrationAssessmentSymfonySmoke } from "./hub-migration-assessment-symfony-smoke.mjs";
import { runMigrationAssessmentExpressSmoke } from "./hub-migration-assessment-express-smoke.mjs";
import { runMigrationAssessmentLaravelMinSmoke } from "./hub-migration-assessment-laravel-min-smoke.mjs";

export const HUB_MIGRATION_ASSESSMENT_ORIGIN_BATCH_KIND = "chrysalis.hub.migration-assessment-origin-batch-smoke";
export const HUB_MIGRATION_ASSESSMENT_ORIGIN_BATCH_SCHEMA_VERSION = 1;

export async function runMigrationAssessmentOriginBatchSmoke() {
  const plainPhp = await runMigrationAssessmentSmoke();
  const symfony = await runMigrationAssessmentSymfonySmoke();
  const express = await runMigrationAssessmentExpressSmoke();
  const laravelMin = await runMigrationAssessmentLaravelMinSmoke();
  return {
    kind: HUB_MIGRATION_ASSESSMENT_ORIGIN_BATCH_KIND,
    schemaVersion: HUB_MIGRATION_ASSESSMENT_ORIGIN_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok === true && symfony.ok && express.ok && laravelMin.ok,
    plainPhp,
    symfony,
    express,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationAssessmentOriginBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
