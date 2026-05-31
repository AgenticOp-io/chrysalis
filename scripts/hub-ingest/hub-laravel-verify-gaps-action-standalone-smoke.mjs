#!/usr/bin/env node
/** Laravel verify gaps action standalone smoke (G332). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runLaravelVerifyGapsAction } from "./hub-laravel-verify-gaps-action.mjs";

export const HUB_LARAVEL_VERIFY_GAPS_ACTION_STANDALONE_KIND = "chrysalis.hub.laravel-verify-gaps-action-standalone-smoke";
export const HUB_LARAVEL_VERIFY_GAPS_ACTION_STANDALONE_SCHEMA_VERSION = 1;

export function runLaravelVerifyGapsActionStandaloneSmoke() {
  const action = runLaravelVerifyGapsAction();
  return {
    kind: HUB_LARAVEL_VERIFY_GAPS_ACTION_STANDALONE_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_GAPS_ACTION_STANDALONE_SCHEMA_VERSION,
    ok: action.ok === true,
    ingestRemediation: action.ingestRemediation?.divergenceKind ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelVerifyGapsActionStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
