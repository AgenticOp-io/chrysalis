#!/usr/bin/env node
/** Chimera + assessment mega batch (G423). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runChimeraCutoverOriginBatchSmoke } from "./hub-chimera-cutover-origin-batch-smoke.mjs";
import { runMigrationAssessmentOriginBatchSmoke } from "./hub-migration-assessment-origin-batch-smoke.mjs";

export const HUB_CHIMERA_ASSESSMENT_MEGA_BATCH_KIND = "chrysalis.hub.chimera-assessment-mega-batch-smoke";
export const HUB_CHIMERA_ASSESSMENT_MEGA_BATCH_SCHEMA_VERSION = 1;

export async function runChimeraAssessmentMegaBatchSmoke() {
  const chimeraCutover = await runChimeraCutoverOriginBatchSmoke();
  const migrationAssessment = await runMigrationAssessmentOriginBatchSmoke();
  return {
    kind: HUB_CHIMERA_ASSESSMENT_MEGA_BATCH_KIND,
    schemaVersion: HUB_CHIMERA_ASSESSMENT_MEGA_BATCH_SCHEMA_VERSION,
    ok: chimeraCutover.ok && migrationAssessment.ok,
    chimeraCutover,
    migrationAssessment,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runChimeraAssessmentMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
