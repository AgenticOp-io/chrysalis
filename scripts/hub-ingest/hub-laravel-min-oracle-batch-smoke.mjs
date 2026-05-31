#!/usr/bin/env node
/** Laravel-min oracle batch: project-to-CWL + verify gaps + post-translate verify (G371). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectToCwlLaravelMinSmoke } from "./hub-project-to-cwl-laravel-min-smoke.mjs";
import { runVerifyGapsLaravelMinSmoke } from "./hub-verify-gaps-laravel-min-smoke.mjs";
import { runPostTranslateVerifyLaravelMinSmoke } from "./hub-post-translate-verify-laravel-min-smoke.mjs";

export const HUB_LARAVEL_MIN_ORACLE_BATCH_KIND = "chrysalis.hub.laravel-min-oracle-batch-smoke";
export const HUB_LARAVEL_MIN_ORACLE_BATCH_SCHEMA_VERSION = 1;

export async function runLaravelMinOracleBatchSmoke() {
  const projectToCwl = await runProjectToCwlLaravelMinSmoke();
  const verifyGaps = runVerifyGapsLaravelMinSmoke();
  const postTranslateVerify = await runPostTranslateVerifyLaravelMinSmoke();
  return {
    kind: HUB_LARAVEL_MIN_ORACLE_BATCH_KIND,
    schemaVersion: HUB_LARAVEL_MIN_ORACLE_BATCH_SCHEMA_VERSION,
    ok: projectToCwl.ok && verifyGaps.ok && postTranslateVerify.ok,
    projectToCwl,
    verifyGaps,
    postTranslateVerify,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runLaravelMinOracleBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
