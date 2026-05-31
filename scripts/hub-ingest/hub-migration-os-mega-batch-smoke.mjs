#!/usr/bin/env node
/** Migration OS mega batch: plain-php + symfony + Laravel-min (G385). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPlainPhpMigrationOsBatchSmoke } from "./hub-plain-php-migration-os-batch-smoke.mjs";
import { runSymfonyMigrationOsBatchSmoke } from "./hub-symfony-migration-os-batch-smoke.mjs";
import { runLaravelMinMigrationOsBatchSmoke } from "./hub-laravel-min-migration-os-batch-smoke.mjs";

export const HUB_MIGRATION_OS_MEGA_BATCH_KIND = "chrysalis.hub.migration-os-mega-batch-smoke";
export const HUB_MIGRATION_OS_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runMigrationOsMegaBatchSmoke() {
  const plainPhp = await runPlainPhpMigrationOsBatchSmoke();
  const symfony = await runSymfonyMigrationOsBatchSmoke();
  const laravelMin = await runLaravelMinMigrationOsBatchSmoke();
  return {
    kind: HUB_MIGRATION_OS_MEGA_BATCH_KIND,
    schemaVersion: HUB_MIGRATION_OS_MEGA_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok && symfony.ok && laravelMin.ok,
    plainPhp,
    symfony,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationOsMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
