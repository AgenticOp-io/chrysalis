#!/usr/bin/env node
/** Verify product ultra batch v6: v5 + auth-probe reingest verify closure (G900). */
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyGapsOriginBatchSmoke } from "./hub-verify-gaps-origin-batch-smoke.mjs";
import { runVerifyStandaloneMegaBatchSmoke } from "./hub-verify-standalone-mega-batch-smoke.mjs";
import { runLaravelDepthBatchSmoke } from "./hub-laravel-depth-batch-smoke.mjs";
import { runFlagshipFullGapsBatchSmoke } from "./hub-flagship-full-gaps-batch-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runGapsIngestStrictBatchSmoke } from "./hub-gaps-ingest-strict-batch-smoke.mjs";

export const HUB_VERIFY_PRODUCT_ULTRA_BATCH_KIND = "chrysalis.hub.verify-product-ultra-batch-smoke";
export const HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION = 6;

export async function runVerifyProductUltraBatchSmoke() {
  const verifyGapsOrigin = runVerifyGapsOriginBatchSmoke();
  const verifyStandaloneMega = await runVerifyStandaloneMegaBatchSmoke();
  const laravelDepth = runLaravelDepthBatchSmoke();
  const flagshipFullGaps = runFlagshipFullGapsBatchSmoke();
  const gapsIngestClosure = runGapsIngestClosureBatchSmoke();
  const gapsIngestStrict = runGapsIngestStrictBatchSmoke();
  const authProbeVerifyClosure = runLaravelAuthProbeReingestVerifyClosureSmoke();
  return {
    kind: HUB_VERIFY_PRODUCT_ULTRA_BATCH_KIND,
    schemaVersion: HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION,
    ok:
      verifyGapsOrigin.ok &&
      verifyStandaloneMega.ok &&
      laravelDepth.ok &&
      flagshipFullGaps.ok &&
      gapsIngestClosure.ok &&
      gapsIngestStrict.ok &&
      authProbeVerifyClosure.ok,
    verifyGapsOrigin,
    verifyStandaloneMega,
    laravelDepth,
    flagshipFullGaps,
    gapsIngestClosure,
    gapsIngestStrict,
    authProbeVerifyClosure,
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
