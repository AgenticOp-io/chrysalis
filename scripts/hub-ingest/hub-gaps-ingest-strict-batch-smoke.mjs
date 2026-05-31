#!/usr/bin/env node
/** Gaps ingest strict batch v4: v3 + auth-probe verify replay + flagship replay (G936). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGapsIngestClosureBatchSmoke } from "./hub-gaps-ingest-closure-batch-smoke.mjs";
import { runLaravelVerifyLiveGapsClosureSmoke } from "./hub-laravel-verify-live-gaps-closure-smoke.mjs";
import { runGapReingestStrictSmoke } from "./hub-gap-reingest-strict-smoke.mjs";
import { runLaravelAuthProbeReingestSmoke } from "./hub-laravel-auth-probe-reingest-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyClosureSmoke } from "./hub-laravel-auth-probe-reingest-verify-closure-smoke.mjs";
import { runLaravelAuthProbeReingestVerifyReplaySmoke } from "./hub-laravel-auth-probe-reingest-verify-replay-smoke.mjs";
import { runFlagshipVerifyReplayBatchSmoke } from "./hub-flagship-verify-replay-batch-smoke.mjs";

export const HUB_GAPS_INGEST_STRICT_BATCH_KIND = "chrysalis.hub.gaps-ingest-strict-batch-smoke";
export const HUB_GAPS_INGEST_STRICT_BATCH_SCHEMA_VERSION = 4;

export async function runGapsIngestStrictBatchSmoke() {
  const gapsIngestClosure = await runGapsIngestClosureBatchSmoke();
  const laravelLiveClosure = await runLaravelVerifyLiveGapsClosureSmoke();
  const gapReingestStrict = await runGapReingestStrictSmoke();
  const authProbeReingest = await runLaravelAuthProbeReingestSmoke();
  const authProbeVerifyClosure = await runLaravelAuthProbeReingestVerifyClosureSmoke();
  const authProbeVerifyReplay = await runLaravelAuthProbeReingestVerifyReplaySmoke();
  const flagshipVerifyReplay = await runFlagshipVerifyReplayBatchSmoke();
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
      flagshipVerifyReplay.ok === true,
    gapsIngestClosure,
    laravelLiveClosure,
    gapReingestStrict,
    authProbeReingest,
    authProbeVerifyClosure,
    authProbeVerifyReplay,
    flagshipVerifyReplay,
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
