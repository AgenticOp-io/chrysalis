#!/usr/bin/env node
/** Gaps ingest closure batch: express seed + flagship gaps v2 + Laravel closure + reingest (G806). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureExpressFlagshipVerifyReport } from "./hub-express-flagship-verify-seed.mjs";
import { runFlagshipFullGapsBatchSmoke } from "./hub-flagship-full-gaps-batch-smoke.mjs";
import { runLaravelVerifyGapsIngestClosureSmoke } from "./hub-laravel-verify-gaps-ingest-closure-smoke.mjs";
import { runGapReingestBatchSmoke } from "./hub-gap-reingest-batch-smoke.mjs";

export const HUB_GAPS_INGEST_CLOSURE_BATCH_KIND = "chrysalis.hub.gaps-ingest-closure-batch-smoke";
export const HUB_GAPS_INGEST_CLOSURE_BATCH_SCHEMA_VERSION = 1;

export function runGapsIngestClosureBatchSmoke() {
  const expressSeed = ensureExpressFlagshipVerifyReport();
  const flagshipFullGaps = runFlagshipFullGapsBatchSmoke();
  const laravelClosure = runLaravelVerifyGapsIngestClosureSmoke();
  const gapReingest = runGapReingestBatchSmoke();
  const expressStrict =
    flagshipFullGaps.express?.ok === true && flagshipFullGaps.express?.skipped == null;
  return {
    kind: HUB_GAPS_INGEST_CLOSURE_BATCH_KIND,
    schemaVersion: HUB_GAPS_INGEST_CLOSURE_BATCH_SCHEMA_VERSION,
    ok: expressSeed.ok === true && flagshipFullGaps.ok === true && expressStrict && laravelClosure.ok === true && gapReingest.ok === true,
    expressSeed,
    flagshipFullGaps,
    laravelClosure,
    gapReingest,
    requireGapReingestEnv: "CHRYSALIS_HUB_GAP_REINGEST",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runGapsIngestClosureBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
