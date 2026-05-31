#!/usr/bin/env node
/** Laravel depth batch: gaps + action + live + min smoke (G343). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLaravelVerifyGapsStandaloneSmoke } from "./hub-laravel-verify-gaps-standalone-smoke.mjs";
import { runLaravelVerifyGapsActionStandaloneSmoke } from "./hub-laravel-verify-gaps-action-standalone-smoke.mjs";
import { runLaravelVerifyLiveStandaloneSmoke } from "./hub-laravel-verify-live-standalone-smoke.mjs";
import { buildHubLaravelMinSmokeReport } from "./hub-laravel-min-smoke.mjs";

export const HUB_LARAVEL_DEPTH_BATCH_KIND = "chrysalis.hub.laravel-depth-batch-smoke";
export const HUB_LARAVEL_DEPTH_BATCH_SCHEMA_VERSION = 1;

export function runLaravelDepthBatchSmoke() {
  const verifyGaps = runLaravelVerifyGapsStandaloneSmoke();
  const verifyGapsAction = runLaravelVerifyGapsActionStandaloneSmoke();
  const verifyLive = runLaravelVerifyLiveStandaloneSmoke();
  const laravelMin = buildHubLaravelMinSmokeReport();
  return {
    kind: HUB_LARAVEL_DEPTH_BATCH_KIND,
    schemaVersion: HUB_LARAVEL_DEPTH_BATCH_SCHEMA_VERSION,
    ok: verifyGaps.ok && verifyGapsAction.ok && verifyLive.ok && laravelMin.ok === true,
    verifyGaps,
    verifyGapsAction,
    verifyLive,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelDepthBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
