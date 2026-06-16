#!/usr/bin/env node
/** Gaps ingest strict batch v7: v6 + reingest Fastify HTTP smoke (G1016). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runLaravelVerifyLiveGapsClosureSmoke } from "./hub-laravel-verify-live-gaps-closure-smoke.mjs";
import { runGapReingestStrictSmoke } from "./hub-gap-reingest-strict-smoke.mjs";
import { runLaravelAuthProbeReingestSmoke } from "./hub-laravel-auth-probe-reingest-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";
import { runFlagshipVerifyReplayBatchSmoke } from "./hub-flagship-verify-replay-batch-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpSmoke } from "./hub-laravel-auth-probe-reingest-verify-http-smoke.mjs";
import { runFlagshipVerifyHttpBatchSmoke } from "./hub-flagship-verify-http-batch-smoke.mjs";
import { runLaravelAuthProbeVerifyHttpFastify } from "./hub-laravel-auth-probe-verify-http-fastify.mjs";
import { runFlagshipVerifyHttpFastifyBatchSmoke } from "./hub-flagship-verify-http-fastify-batch-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyHttpFastifySmoke } from "./hub-laravel-auth-probe-reingest-verify-http-fastify-smoke.mjs";
import { createSmokeProgress, runSmokeSteps } from "./hub-smoke-progress.mjs";

export const HUB_GAPS_INGEST_STRICT_BATCH_KIND = "chrysalis.hub.gaps-ingest-strict-batch-smoke";
export const HUB_GAPS_INGEST_STRICT_BATCH_SCHEMA_VERSION = 7;

export async function runGapsIngestStrictBatchSmoke() {
  createSmokeProgress("gaps-ingest-strict").info("batch start (12 steps)");
  const parts = await runSmokeSteps("gaps-ingest-strict", [
    { id: "gapsIngestClosure", run: () => runGapsIngestClosureBatchSmoke() },
    { id: "laravelLiveClosure", run: () => runLaravelVerifyLiveGapsClosureSmoke() },
    { id: "gapReingestStrict", run: () => runGapReingestStrictSmoke() },
    { id: "authProbeReingest", run: () => runLaravelAuthProbeReingestSmoke() },
    { id: "authProbeVerifyClosure", run: () => runLaravelAuthProbeReingestVerifyClosureSmoke() },
    { id: "authProbeVerifyReplay", run: () => runLaravelAuthProbeReingestVerifyReplaySmoke() },
    { id: "authProbeVerifyHttp", run: () => runLaravelAuthProbeReingestVerifyHttpSmoke() },
    { id: "flagshipVerifyHttp", run: () => runFlagshipVerifyHttpBatchSmoke() },
    { id: "authProbeVerifyHttpFastify", run: () => runLaravelAuthProbeVerifyHttpFastify() },
    { id: "authProbeReingestVerifyHttpFastify", run: () => runLaravelAuthProbeReingestVerifyHttpFastifySmoke() },
    { id: "flagshipVerifyHttpFastify", run: () => runFlagshipVerifyHttpFastifyBatchSmoke() },
    { id: "flagshipVerifyReplay", run: () => runFlagshipVerifyReplayBatchSmoke() },
  ]);
  createSmokeProgress("gaps-ingest-strict").info("batch complete");

  const gapsIngestClosure = parts.gapsIngestClosure;
  const laravelLiveClosure = parts.laravelLiveClosure;
  const gapReingestStrict = parts.gapReingestStrict;
  const authProbeReingest = parts.authProbeReingest;
  const authProbeVerifyClosure = parts.authProbeVerifyClosure;
  const authProbeVerifyReplay = parts.authProbeVerifyReplay;
  const authProbeVerifyHttp = parts.authProbeVerifyHttp;
  const flagshipVerifyHttp = parts.flagshipVerifyHttp;
  const authProbeVerifyHttpFastify = parts.authProbeVerifyHttpFastify;
  const authProbeReingestVerifyHttpFastify = parts.authProbeReingestVerifyHttpFastify;
  const flagshipVerifyHttpFastify = parts.flagshipVerifyHttpFastify;
  const flagshipVerifyReplay = parts.flagshipVerifyReplay;

  return {
    kind: HUB_GAPS_INGEST_STRICT_BATCH_KIND,
    schemaVersion: HUB_GAPS_INGEST_STRICT_BATCH_SCHEMA_VERSION,
    ok:
      gapsIngestClosure.ok === true &&
      laravelLiveClosure.ok === true &&
      gapReingestStrict.ok === true &&
      authProbeReingest.ok === true &&
      authProbeVerifyClosure.ok === true &&
      authProbeVerifyReplay.ok === true &&
      authProbeVerifyHttp.ok === true &&
      authProbeVerifyHttpFastify.ok === true &&
      authProbeReingestVerifyHttpFastify.ok === true &&
      flagshipVerifyReplay.ok === true &&
      flagshipVerifyHttp.ok === true &&
      flagshipVerifyHttpFastify.ok === true,
    gapsIngestClosure,
    laravelLiveClosure,
    gapReingestStrict,
    authProbeReingest,
    authProbeVerifyClosure,
    authProbeVerifyReplay,
    authProbeVerifyHttp,
    authProbeVerifyHttpFastify,
    authProbeReingestVerifyHttpFastify,
    flagshipVerifyReplay,
    flagshipVerifyHttp,
    flagshipVerifyHttpFastify,
    requireVerifyHttpEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP",
    requireEnv: "CHRYSALIS_HUB_COMPLETION_REQUIRE_GAPS_INGEST_CLOSURE_BATCH",
    requireStrictReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST_STRICT",
    requireVerifyClosureEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE",
    requireVerifyReplayEnv: "CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runGapsIngestStrictBatchSmoke();
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
