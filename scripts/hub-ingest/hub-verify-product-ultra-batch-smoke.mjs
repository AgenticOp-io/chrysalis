#!/usr/bin/env node
/** Verify product ultra batch v9: v8 + Fastify HTTP verify smokes (G988). */
import { runLaravelAuthProbeReingestVerifyHttpSmoke } from "./hub-laravel-auth-probe-reingest-verify-http-smoke.mjs";
import { runFlagshipVerifyHttpBatchSmoke } from "./hub-flagship-verify-http-batch-smoke.mjs";
import { runLaravelAuthProbeVerifyHttpFastify } from "./hub-laravel-auth-probe-verify-http-fastify.mjs";
import { runFlagshipVerifyHttpFastifyBatchSmoke } from "./hub-flagship-verify-http-fastify-batch-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";
import { runFlagshipVerifyReplayBatchSmoke } from "./hub-flagship-verify-replay-batch-smoke.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyGapsOriginBatchSmoke } from "./hub-verify-gaps-origin-batch-smoke.mjs";
import { runVerifyStandaloneMegaBatchSmoke } from "./hub-verify-standalone-mega-batch-smoke.mjs";
import { runLaravelDepthBatchSmoke } from "./hub-laravel-depth-batch-smoke.mjs";
import { runFlagshipFullGapsBatchSmoke } from "./hub-flagship-full-gaps-batch-smoke.mjs";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runGapsIngestStrictBatchSmoke } from "./hub-gaps-ingest-strict-batch-smoke.mjs";

export const HUB_VERIFY_PRODUCT_ULTRA_BATCH_KIND = "chrysalis.hub.verify-product-ultra-batch-smoke";
export const HUB_VERIFY_PRODUCT_ULTRA_BATCH_SCHEMA_VERSION = 9;

export async function runVerifyProductUltraBatchSmoke() {
  const verifyGapsOrigin = await runVerifyGapsOriginBatchSmoke();
  const verifyStandaloneMega = await runVerifyStandaloneMegaBatchSmoke();
  const laravelDepth = runLaravelDepthBatchSmoke();
  const flagshipFullGaps = await runFlagshipFullGapsBatchSmoke();
  const gapsIngestClosure = await runGapsIngestClosureBatchSmoke();
  const gapsIngestStrict = await runGapsIngestStrictBatchSmoke();
  const authProbeVerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();
  const authProbeVerifyReplay = await runLaravelAuthProbeReingestVerifyReplaySmoke();
  const authProbeVerifyHttp = await runLaravelAuthProbeReingestVerifyHttpSmoke();
  const flagshipVerifyReplay = await runFlagshipVerifyReplayBatchSmoke();
  const flagshipVerifyHttp = await runFlagshipVerifyHttpBatchSmoke();
  const authProbeVerifyHttpFastify = await runLaravelAuthProbeVerifyHttpFastify();
  const flagshipVerifyHttpFastify = await runFlagshipVerifyHttpFastifyBatchSmoke();
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
      authProbeVerifyClosure.ok &&
      authProbeVerifyReplay.ok &&
      authProbeVerifyHttp.ok &&
      flagshipVerifyReplay.ok &&
      flagshipVerifyHttp.ok &&
      authProbeVerifyHttpFastify.ok === true &&
      flagshipVerifyHttpFastify.ok,
    verifyGapsOrigin,
    verifyStandaloneMega,
    laravelDepth,
    flagshipFullGaps,
    gapsIngestClosure,
    gapsIngestStrict,
    authProbeVerifyClosure,
    authProbeVerifyReplay,
    authProbeVerifyHttp,
    flagshipVerifyReplay,
    flagshipVerifyHttp,
    authProbeVerifyHttpFastify,
    flagshipVerifyHttpFastify,
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
