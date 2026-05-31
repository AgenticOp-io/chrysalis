#!/usr/bin/env node
/** Post-translate artifacts origin batch: symfony + express + Laravel-min (G414). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPostTranslateArtifactsSymfonySmoke } from "./hub-post-translate-artifacts-symfony-smoke.mjs";
import { runPostTranslateArtifactsExpressSmoke } from "./hub-post-translate-artifacts-express-smoke.mjs";
import { runPostTranslateArtifactsLaravelMinSmoke } from "./hub-post-translate-artifacts-laravel-min-smoke.mjs";

export const HUB_POST_TRANSLATE_ARTIFACTS_ORIGIN_BATCH_KIND = "chrysalis.hub.post-translate-artifacts-origin-batch-smoke";
export const HUB_POST_TRANSLATE_ARTIFACTS_ORIGIN_BATCH_SCHEMA_VERSION = 1;

export async function runPostTranslateArtifactsOriginBatchSmoke() {
  const symfony = await runPostTranslateArtifactsSymfonySmoke();
  const express = await runPostTranslateArtifactsExpressSmoke();
  const laravelMin = await runPostTranslateArtifactsLaravelMinSmoke();
  return {
    kind: HUB_POST_TRANSLATE_ARTIFACTS_ORIGIN_BATCH_KIND,
    schemaVersion: HUB_POST_TRANSLATE_ARTIFACTS_ORIGIN_BATCH_SCHEMA_VERSION,
    ok: symfony.ok && express.ok && laravelMin.ok,
    symfony,
    express,
    laravelMin,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPostTranslateArtifactsOriginBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
