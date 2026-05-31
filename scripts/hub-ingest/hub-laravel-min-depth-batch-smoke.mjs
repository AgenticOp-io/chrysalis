#!/usr/bin/env node
/** Laravel-min depth batch: site intel + path advice + project-to-CWL + assessment + chimera (G421). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSiteIntelligenceLaravelMinSmoke } from "./hub-site-intelligence-laravel-min-smoke.mjs";
import { runPathAdviceLaravelMinSmoke } from "./hub-path-advice-laravel-min-smoke.mjs";
import { runProjectToCwlLaravelMinSmoke } from "./hub-project-to-cwl-laravel-min-smoke.mjs";
import { runMigrationAssessmentLaravelMinSmoke } from "./hub-migration-assessment-laravel-min-smoke.mjs";
import { runChimeraCutoverLaravelMinSmoke } from "./hub-chimera-cutover-laravel-min-smoke.mjs";

export const HUB_LARAVEL_MIN_DEPTH_BATCH_KIND = "chrysalis.hub.laravel-min-depth-batch-smoke";
export const HUB_LARAVEL_MIN_DEPTH_BATCH_SCHEMA_VERSION = 1;

export async function runLaravelMinDepthBatchSmoke() {
  const siteIntelligence = await runSiteIntelligenceLaravelMinSmoke();
  const pathAdvice = await runPathAdviceLaravelMinSmoke();
  const projectToCwl = await runProjectToCwlLaravelMinSmoke();
  const migrationAssessment = await runMigrationAssessmentLaravelMinSmoke();
  const chimeraCutover = await runChimeraCutoverLaravelMinSmoke();
  return {
    kind: HUB_LARAVEL_MIN_DEPTH_BATCH_KIND,
    schemaVersion: HUB_LARAVEL_MIN_DEPTH_BATCH_SCHEMA_VERSION,
    ok:
      siteIntelligence.ok &&
      pathAdvice.ok &&
      projectToCwl.ok &&
      migrationAssessment.ok &&
      chimeraCutover.ok,
    siteIntelligence,
    pathAdvice,
    projectToCwl,
    migrationAssessment,
    chimeraCutover,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLaravelMinDepthBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
