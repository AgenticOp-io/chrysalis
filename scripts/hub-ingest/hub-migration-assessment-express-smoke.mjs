#!/usr/bin/env node
/** Migration assessment smoke on Express flagship (G309). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMigrationAssessment } from "./hub-migration-assessment.mjs";
import { ensureProjectWebir } from "./hub-project-to-cwl-gates.mjs";

export const HUB_MIGRATION_ASSESSMENT_EXPRESS_SMOKE_KIND = "chrysalis.hub.migration-assessment-express-smoke";
export const HUB_MIGRATION_ASSESSMENT_EXPRESS_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const expressFixture = join(scriptRoot, "fixtures/hub-flagship-express");

export async function runMigrationAssessmentExpressSmoke(projectDir = expressFixture) {
  const root = resolve(projectDir);
  await ensureProjectWebir(root, "javascript");
  const report = await buildMigrationAssessment({ projectDir: root, origin: "javascript", output: "hono" });
  return {
    kind: HUB_MIGRATION_ASSESSMENT_EXPRESS_SMOKE_KIND,
    schemaVersion: HUB_MIGRATION_ASSESSMENT_EXPRESS_SMOKE_SCHEMA_VERSION,
    ok: Boolean(report.readinessTier) && Boolean(report.program?.id),
    readinessTier: report.readinessTier ?? null,
    programId: report.program?.id ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationAssessmentExpressSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
