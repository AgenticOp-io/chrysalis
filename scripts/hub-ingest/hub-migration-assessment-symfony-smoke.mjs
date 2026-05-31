#!/usr/bin/env node
/** Migration assessment smoke on Symfony flagship (G298). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrationAssessmentSmoke } from "./hub-migration-assessment-smoke.mjs";

export const HUB_MIGRATION_ASSESSMENT_SYMFONY_SMOKE_KIND = "chrysalis.hub.migration-assessment-symfony-smoke";
export const HUB_MIGRATION_ASSESSMENT_SYMFONY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const symfonyFixture = join(scriptRoot, "fixtures/hub-flagship-symfony");

export async function runMigrationAssessmentSymfonySmoke() {
  const report = await runMigrationAssessmentSmoke(symfonyFixture);
  return {
    kind: HUB_MIGRATION_ASSESSMENT_SYMFONY_SMOKE_KIND,
    schemaVersion: HUB_MIGRATION_ASSESSMENT_SYMFONY_SMOKE_SCHEMA_VERSION,
    ok: report.ok === true,
    readinessTier: report.readinessTier ?? null,
    programId: report.programId ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationAssessmentSymfonySmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
