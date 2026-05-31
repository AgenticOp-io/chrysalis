#!/usr/bin/env node
/** Laravel verify gaps export + ingest action batch (G681). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLaravelVerifyGapsStandaloneSmoke } from "./hub-laravel-verify-gaps-standalone-smoke.mjs";
import { runLaravelVerifyGapsActionStandaloneSmoke } from "./hub-laravel-verify-gaps-action-standalone-smoke.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_BATCH_KIND = "chrysalis.hub.laravel-verify-gaps-batch-smoke";
export const HUB_LARAVEL_VERIFY_GAPS_BATCH_SCHEMA_VERSION = 1;

export function runLaravelVerifyGapsBatchSmoke() {
  const gaps = runLaravelVerifyGapsStandaloneSmoke();
  const action = runLaravelVerifyGapsActionStandaloneSmoke();
  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_BATCH_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_BATCH_SCHEMA_VERSION,
    ok: gaps.ok === true && action.ok === true,
    gaps,
    action,
    backlogCount: gaps.backlogCount ?? null,
    ingestNext: gaps.ingestNext ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelVerifyGapsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
