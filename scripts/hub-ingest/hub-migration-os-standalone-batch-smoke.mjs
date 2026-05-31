#!/usr/bin/env node
/** Migration OS standalone batch: site intel + assessment + chimera + path knowledge (G272/G277). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceSmoke } from "./hub-site-intelligence-smoke.mjs";
import { runMigrationAssessmentSmoke } from "./hub-migration-assessment-smoke.mjs";
import { runChimeraCutoverSmoke } from "./hub-chimera-cutover-smoke.mjs";
import { runPathKnowledgeSmoke } from "./hub-path-knowledge-smoke.mjs";
import { runLanguageCompareSmoke } from "./hub-language-compare-smoke.mjs";

export const HUB_MIGRATION_OS_STANDALONE_BATCH_KIND = "chrysalis.hub.migration-os-standalone-batch-smoke";
export const HUB_MIGRATION_OS_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export async function runMigrationOsStandaloneBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceSmoke();
  const migrationAssessment = await runMigrationAssessmentSmoke();
  const chimeraCutover = await runChimeraCutoverSmoke();
  const pathKnowledge = runPathKnowledgeSmoke();
  const languageCompare = runLanguageCompareSmoke();
  const ok =
    siteIntelligence.ok &&
    migrationAssessment.ok &&
    chimeraCutover.ok &&
    pathKnowledge.ok &&
    languageCompare.ok;
  return {
    kind: HUB_MIGRATION_OS_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_MIGRATION_OS_STANDALONE_BATCH_SCHEMA_VERSION,
    ok,
    siteIntelligence,
    migrationAssessment,
    chimeraCutover,
    pathKnowledge,
    languageCompare,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runMigrationOsStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
