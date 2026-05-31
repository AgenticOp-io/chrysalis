#!/usr/bin/env node
/** Laravel verify live standalone smoke (G333). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportHubLaravelVerifyLive } from "./hub-laravel-verify-export.mjs";

export const HUB_LARAVEL_VERIFY_LIVE_STANDALONE_KIND = "chrysalis.hub.laravel-verify-live-standalone-smoke";
export const HUB_LARAVEL_VERIFY_LIVE_STANDALONE_SCHEMA_VERSION = 1;

export function runLaravelVerifyLiveStandaloneSmoke() {
  const live = exportHubLaravelVerifyLive();
  return {
    kind: HUB_LARAVEL_VERIFY_LIVE_STANDALONE_KIND,
    schemaVersion: HUB_LARAVEL_VERIFY_LIVE_STANDALONE_SCHEMA_VERSION,
    ok: live.ok === true || live.error === "missing-summary",
    skip: live.error ?? null,
    aggregate: live.aggregate ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runLaravelVerifyLiveStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
