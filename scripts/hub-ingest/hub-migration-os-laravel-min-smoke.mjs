#!/usr/bin/env node
/** Migration OS smoke on Laravel-min scaffold (G355). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationOsSmoke } from "./hub-migration-os-smoke.mjs";

export const HUB_MIGRATION_OS_LARAVEL_MIN_SMOKE_KIND = "chrysalis.hub.migration-os-laravel-min-smoke";
export const HUB_MIGRATION_OS_LARAVEL_MIN_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const laravelMinFixture = join(scriptRoot, "flagship/laravel-min");

export async function runMigrationOsLaravelMinSmoke(projectDir = laravelMinFixture) {
  const report = await runMigrationOsSmoke(projectDir);
  return {
    kind: HUB_MIGRATION_OS_LARAVEL_MIN_SMOKE_KIND,
    schemaVersion: HUB_MIGRATION_OS_LARAVEL_MIN_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true,
    contract: report.contract ?? null,
    planner: report.planner ?? null,
    programs: report.programs ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationOsLaravelMinSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
