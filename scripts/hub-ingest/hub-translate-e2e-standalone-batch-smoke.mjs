#!/usr/bin/env node
/** Translate E2E standalone batch smoke (G305). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHubTranslateE2eBatch } from "./hub-translate-e2e-smoke.mjs";

export const HUB_TRANSLATE_E2E_STANDALONE_BATCH_KIND = "chrysalis.hub.translate-e2e-standalone-batch-smoke";
export const HUB_TRANSLATE_E2E_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export function runTranslateE2eStandaloneBatchSmoke() {
  const batch = runHubTranslateE2eBatch(["plainPhp", "symfony", "express", "tinyBlog"]);
  const ok =
    batch.ok === true ||
    (batch.results?.plainPhp?.skip === "missing-cli-dist" &&
      batch.results?.symfony?.skip === "missing-cli-dist");
  return {
    kind: HUB_TRANSLATE_E2E_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_TRANSLATE_E2E_STANDALONE_BATCH_SCHEMA_VERSION,
    ok,
    variants: batch.results ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runTranslateE2eStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
