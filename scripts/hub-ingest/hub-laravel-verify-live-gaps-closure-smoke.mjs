#!/usr/bin/env node
/** Laravel live verify gaps closure: clean backlog or ingest remediation when non-zero (G832). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";

export const HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_KIND = "chrysalis.hub.laravel-verify-live-gaps-closure-smoke";
export const HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_SCHEMA_VERSION = 1;

export function runLaravelVerifyLiveGapsClosureSmoke() {
  const gaps = buildLaravelVerifyGapsReport();
  const action = runLaravelVerifyGapsAction();
  const backlogCount = gaps.backlog?.length ?? 0;
  const ok =
    gaps.ok === true &&
    gaps.skipped == null &&
    (backlogCount === 0 || (gaps.ingestNext != null && action.ok === true && action.ingestRemediation != null));
  return {
    kind: HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_LIVE_GAPS_CLOSURE_SCHEMA_VERSION,
    ok,
    backlogCount,
    ingestNext: gaps.ingestNext?.divergenceKind ?? null,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    correctness: gaps.verify?.correctness ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelVerifyLiveGapsClosureSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
