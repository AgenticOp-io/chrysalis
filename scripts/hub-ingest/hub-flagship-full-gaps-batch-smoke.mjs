#!/usr/bin/env node
/** Flagship-full gaps batch v3: v2 + flagship trace replay verify (G937). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureExpressFlagshipVerifyReport } from "./hub-express-flagship-verify-seed.mjs";
import { runFlagshipVerifyGapsStandaloneSmoke } from "./hub-flagship-verify-gaps-standalone-smoke.mjs";
import { runFlagshipVerifyReplayBatchSmoke } from "./hub-flagship-verify-replay-batch-smoke.mjs";

export const HUB_FLAGSHIP_FULL_GAPS_BATCH_KIND = "chrysalis.hub.flagship-full-gaps-batch-smoke";
export const HUB_FLAGSHIP_FULL_GAPS_BATCH_SCHEMA_VERSION = 3;

export async function runFlagshipFullGapsBatchSmoke() {
  const expressSeed = ensureExpressFlagshipVerifyReport();
  const plainPhp = await runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "plainPhp" });
  const symfony = await runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "symfony" });
  const express = await runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "express" });
  const verifyReplay = await runFlagshipVerifyReplayBatchSmoke();
  const backlogCount = (plainPhp.backlogCount ?? 0) + (symfony.backlogCount ?? 0) + (express.backlogCount ?? 0);
  const ingestNext =
    plainPhp.ingestNext ?? symfony.ingestNext ?? express.ingestNext ?? null;
  return {
    kind: HUB_FLAGSHIP_FULL_GAPS_BATCH_KIND,
    schemaVersion: HUB_FLAGSHIP_FULL_GAPS_BATCH_SCHEMA_VERSION,
    ok:
      expressSeed.ok === true &&
      plainPhp.ok === true &&
      symfony.ok === true &&
      express.ok === true &&
      express.skipped == null &&
      verifyReplay.ok === true,
    expressSeed,
    plainPhp,
    symfony,
    express,
    verifyReplay,
    backlogCount,
    ingestNext,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFlagshipFullGapsBatchSmoke();
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
