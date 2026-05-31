#!/usr/bin/env node
/** Laravel verify gaps standalone smoke (G331). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLaravelVerifyGapsReport } from "./hub-laravel-verify-gaps.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_STANDALONE_KIND = "chrysalis.hub.laravel-verify-gaps-standalone-smoke";
export const HUB_LARAVEL_VERIFY_GAPS_STANDALONE_SCHEMA_VERSION = 1;

export function runLaravelVerifyGapsStandaloneSmoke() {
  const gaps = buildLaravelVerifyGapsReport();
  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_STANDALONE_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_STANDALONE_SCHEMA_VERSION,
    ok: gaps.ok === true,
    backlogCount: gaps.backlog?.length ?? 0,
    ingestNext: gaps.ingestNext?.divergenceKind ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelVerifyGapsStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
