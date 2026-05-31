#!/usr/bin/env node
/** Plain-php + symfony + express trace replay verify batch (G925). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runFlagshipVerifyReplay } from "./hub-flagship-verify-replay.mjs";

export const HUB_FLAGSHIP_VERIFY_REPLAY_BATCH_KIND = "chrysalis.hub.flagship-verify-replay-batch-smoke";
export const HUB_FLAGSHIP_VERIFY_REPLAY_BATCH_SCHEMA_VERSION = 1;

export async function runFlagshipVerifyReplayBatchSmoke() {
  const plainPhp = await runFlagshipVerifyReplay(undefined, { profile: "plainPhp" });
  const symfony = await runFlagshipVerifyReplay(undefined, { profile: "symfony" });
  const express = await runFlagshipVerifyReplay(undefined, { profile: "express" });
  return {
    kind: HUB_FLAGSHIP_VERIFY_REPLAY_BATCH_KIND,
    schemaVersion: HUB_FLAGSHIP_VERIFY_REPLAY_BATCH_SCHEMA_VERSION,
    ok: plainPhp.ok === true && symfony.ok === true && express.ok === true,
    plainPhp,
    symfony,
    express,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runFlagshipVerifyReplayBatchSmoke();
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
