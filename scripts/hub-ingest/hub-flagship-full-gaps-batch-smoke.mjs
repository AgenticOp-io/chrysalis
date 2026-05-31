#!/usr/bin/env node
/** Flagship-full gaps batch: plain-php + symfony + express verify gaps → ingest (G771). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFlagshipVerifyGapsStandaloneSmoke } from "./hub-flagship-verify-gaps-standalone-smoke.mjs";

export const HUB_FLAGSHIP_FULL_GAPS_BATCH_KIND = "chrysalis.hub.flagship-full-gaps-batch-smoke";
export const HUB_FLAGSHIP_FULL_GAPS_BATCH_SCHEMA_VERSION = 1;

export function runFlagshipFullGapsBatchSmoke() {
  const plainPhp = runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "plainPhp" });
  const symfony = runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "symfony" });
  const express = runFlagshipVerifyGapsStandaloneSmoke(undefined, { profile: "express" });
  const backlogCount = (plainPhp.backlogCount ?? 0) + (symfony.backlogCount ?? 0) + (express.backlogCount ?? 0);
  const ingestNext =
    plainPhp.ingestNext ?? symfony.ingestNext ?? express.ingestNext ?? null;
  return {
    kind: HUB_FLAGSHIP_FULL_GAPS_BATCH_KIND,
    schemaVersion: HUB_FLAGSHIP_FULL_GAPS_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok === true && symfony.ok === true && express.ok === true,
    plainPhp,
    symfony,
    express,
    backlogCount,
    ingestNext,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runFlagshipFullGapsBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
