#!/usr/bin/env node
/** Verify gaps origin batch v2: v1 + plain-php flagship gaps (G836). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyGapsSymfonySmoke } from "./hub-verify-gaps-symfony-smoke.mjs";
import { runVerifyGapsExpressSmoke } from "./hub-verify-gaps-express-smoke.mjs";
import { runVerifyGapsLaravelMinSmoke } from "./hub-verify-gaps-laravel-min-smoke.mjs";
import { runFlagshipVerifyGapsStandaloneSmoke } from "./hub-flagship-verify-gaps-standalone-smoke.mjs";
import { ensureExpressFlagshipVerifyReport } from "./hub-express-flagship-verify-seed.mjs";

export const HUB_VERIFY_GAPS_ORIGIN_BATCH_KIND = "chrysalis.hub.verify-gaps-origin-batch-smoke";
export const HUB_VERIFY_GAPS_ORIGIN_BATCH_SCHEMA_VERSION = 2;

export async function runVerifyGapsOriginBatchSmoke() {
  ensureExpressFlagshipVerifyReport();
  const plainPhp = await runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "plainPhp" });
  const symfony = runVerifyGapsSymfonySmoke();
  const express = runVerifyGapsExpressSmoke();
  const laravelMin = runVerifyGapsLaravelMinSmoke();
  return {
    kind: HUB_VERIFY_GAPS_ORIGIN_BATCH_KIND,
    schemaVersion: HUB_VERIFY_GAPS_ORIGIN_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok && symfony.ok && express.ok && laravelMin.ok,
    plainPhp,
    symfony,
    express,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVerifyGapsOriginBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
