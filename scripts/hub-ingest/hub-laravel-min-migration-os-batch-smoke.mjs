#!/usr/bin/env node
/** Laravel-min migration OS batch: migration OS + assessment + chimera (G353). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationOsLaravelMinSmoke } from "./hub-migration-os-laravel-min-smoke.mjs";
import { runMigrationAssessmentLaravelMinSmoke } from "./hub-migration-assessment-laravel-min-smoke.mjs";
import { runChimeraCutoverLaravelMinSmoke } from "./hub-chimera-cutover-laravel-min-smoke.mjs";

export const HUB_LARAVEL_MIN_MIGRATION_OS_BATCH_KIND = "chrysalis.hub.laravel-min-migration-os-batch-smoke";
export const HUB_LARAVEL_MIN_MIGRATION_OS_BATCH_SCHEMA_VERSION = 1;

export async function runLaravelMinMigrationOsBatchSmoke() {
  const migrationOs = await runMigrationOsLaravelMinSmoke();
  const migrationAssessment = await runMigrationAssessmentLaravelMinSmoke();
  const chimeraCutover = await runChimeraCutoverLaravelMinSmoke();
  return {
    kind: HUB_LARAVEL_MIN_MIGRATION_OS_BATCH_KIND,
    schemaVersion: HUB_LARAVEL_MIN_MIGRATION_OS_BATCH_SCHEMA_VERSION,
    ok: migrationOs.ok && migrationAssessment.ok && chimeraCutover.ok,
    migrationOs,
    migrationAssessment,
    chimeraCutover,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLaravelMinMigrationOsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
