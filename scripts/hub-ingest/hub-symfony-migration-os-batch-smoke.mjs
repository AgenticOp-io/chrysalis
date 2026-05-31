#!/usr/bin/env node
/** Symfony migration OS delivery batch smoke (G307). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationOsSymfonySmoke } from "./hub-migration-os-symfony-smoke.mjs";
import { runMigrationAssessmentSymfonySmoke } from "./hub-migration-assessment-symfony-smoke.mjs";
import { runChimeraCutoverSymfonySmoke } from "./hub-chimera-cutover-symfony-smoke.mjs";

export const HUB_SYMFONY_MIGRATION_OS_BATCH_KIND = "chrysalis.hub.symfony-migration-os-batch-smoke";
export const HUB_SYMFONY_MIGRATION_OS_BATCH_SCHEMA_VERSION = 1;

export async function runSymfonyMigrationOsBatchSmoke() {
  const migrationOs = await runMigrationOsSymfonySmoke();
  const assessment = await runMigrationAssessmentSymfonySmoke();
  const chimera = await runChimeraCutoverSymfonySmoke();
  return {
    kind: HUB_SYMFONY_MIGRATION_OS_BATCH_KIND,
    schemaVersion: HUB_SYMFONY_MIGRATION_OS_BATCH_SCHEMA_VERSION,
    ok: migrationOs.ok && assessment.ok && chimera.ok,
    migrationOs,
    assessment,
    chimera,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runSymfonyMigrationOsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
