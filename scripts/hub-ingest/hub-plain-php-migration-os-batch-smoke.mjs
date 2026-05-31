#!/usr/bin/env node
/** Plain-php migration OS batch: migration OS + assessment + chimera (G340). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationOsSmoke } from "./hub-migration-os-smoke.mjs";
import { runMigrationAssessmentSmoke } from "./hub-migration-assessment-smoke.mjs";
import { runChimeraCutoverSmoke } from "./hub-chimera-cutover-smoke.mjs";

export const HUB_PLAIN_PHP_MIGRATION_OS_BATCH_KIND = "chrysalis.hub.plain-php-migration-os-batch-smoke";
export const HUB_PLAIN_PHP_MIGRATION_OS_BATCH_SCHEMA_VERSION = 1;

export async function runPlainPhpMigrationOsBatchSmoke() {
  const migrationOs = await runMigrationOsSmoke();
  const migrationAssessment = await runMigrationAssessmentSmoke();
  const chimeraCutover = await runChimeraCutoverSmoke();
  return {
    kind: HUB_PLAIN_PHP_MIGRATION_OS_BATCH_KIND,
    schemaVersion: HUB_PLAIN_PHP_MIGRATION_OS_BATCH_SCHEMA_VERSION,
    ok: migrationOs.ok && migrationAssessment.ok && chimeraCutover.ok,
    migrationOs,
    migrationAssessment,
    chimeraCutover,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPlainPhpMigrationOsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
