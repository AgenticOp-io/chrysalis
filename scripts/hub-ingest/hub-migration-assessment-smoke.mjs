#!/usr/bin/env node
/** Migration assessment standalone smoke (G267). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMigrationAssessment } from "./hub-migration-assessment.mjs";

export const HUB_MIGRATION_ASSESSMENT_SMOKE_KIND = "chrysalis.hub.migration-assessment-smoke";
export const HUB_MIGRATION_ASSESSMENT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultFixture = join(scriptRoot, "fixtures/hub-flagship-plain-php");

export async function runMigrationAssessmentSmoke(projectDir = defaultFixture) {
  const report = await buildMigrationAssessment({ projectDir: resolve(projectDir), origin: "php", output: "hono" });
  return {
    kind: HUB_MIGRATION_ASSESSMENT_SMOKE_KIND,
    schemaVersion: HUB_MIGRATION_ASSESSMENT_SMOKE_SCHEMA_VERSION,
    ok: Boolean(report.readinessTier) && Boolean(report.program?.id),
    readinessTier: report.readinessTier ?? null,
    programId: report.program?.id ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationAssessmentSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
