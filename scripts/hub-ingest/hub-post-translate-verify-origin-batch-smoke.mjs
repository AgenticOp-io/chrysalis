#!/usr/bin/env node
/** Post-translate verify origin batch: symfony + express + laravel-min (G399). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPostTranslateVerifySymfonySmoke } from "./hub-post-translate-verify-symfony-smoke.mjs";
import { runPostTranslateVerifyExpressSmoke } from "./hub-post-translate-verify-express-smoke.mjs";
import { runPostTranslateVerifyLaravelMinSmoke } from "./hub-post-translate-verify-laravel-min-smoke.mjs";

export const HUB_POST_TRANSLATE_VERIFY_ORIGIN_BATCH_KIND = "chrysalis.hub.post-translate-verify-origin-batch-smoke";
export const HUB_POST_TRANSLATE_VERIFY_ORIGIN_BATCH_SCHEMA_VERSION = 1;

export async function runPostTranslateVerifyOriginBatchSmoke() {
  const symfony = await runPostTranslateVerifySymfonySmoke();
  const express = await runPostTranslateVerifyExpressSmoke();
  const laravelMin = await runPostTranslateVerifyLaravelMinSmoke();
  return {
    kind: HUB_POST_TRANSLATE_VERIFY_ORIGIN_BATCH_KIND,
    schemaVersion: HUB_POST_TRANSLATE_VERIFY_ORIGIN_BATCH_SCHEMA_VERSION,
    ok: symfony.ok && express.ok && laravelMin.ok,
    symfony,
    express,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateVerifyOriginBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
