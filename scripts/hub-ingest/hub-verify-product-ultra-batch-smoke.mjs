#!/usr/bin/env node
/** Verify product ultra batch: verify gaps origin + verify standalone mega + laravel depth (G424). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyGapsOriginBatchSmoke } from "./hub-verify-gaps-origin-batch-smoke.mjs";
import { runVerifyStandaloneMegaBatchSmoke } from "./hub-verify-standalone-mega-batch-smoke.mjs";
import { runLaravelDepthBatchSmoke } from "./hub-laravel-depth-batch-smoke.mjs";

export const HUB_VERIFY_PRODUCT_ULTRA_BATCH_KIND = "chrysalis.hub.verify-product-ultra-batch-smoke";
export const HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION = 1;

export async function runVerifyProductUltraBatchSmoke() {
  const verifyGapsOrigin = runVerifyGapsOriginBatchSmoke();
  const verifyStandaloneMega = await runVerifyStandaloneMegaBatchSmoke();
  const laravelDepth = runLaravelDepthBatchSmoke();
  return {
    kind: HUB_VERIFY_PRODUCT_ULTRA_BATCH_KIND,
    schemaVersion: HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    ok: verifyGapsOrigin.ok && verifyStandaloneMega.ok && laravelDepth.ok,
    verifyGapsOrigin,
    verifyStandaloneMega,
    laravelDepth,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runVerifyProductUltraBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
