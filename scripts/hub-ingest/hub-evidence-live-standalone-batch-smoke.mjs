#!/usr/bin/env node
/** Evidence live standalone batch smoke (G304). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHubEvidenceLiveBatch } from "./hub-evidence-live.mjs";

export const HUB_EVIDENCE_LIVE_STANDALONE_BATCH_KIND = "chrysalis.hub.evidence-live-standalone-batch-smoke";
export const HUB_EVIDENCE_LIVE_STANDALONE_BATCH_SCHEMA_VERSION = 1;

export async function runEvidenceLiveStandaloneBatchSmoke() {
  const batch = await runHubEvidenceLiveBatch(["plainPhp", "symfony", "express", "tinyBlog"]);
  return {
    kind: HUB_EVIDENCE_LIVE_STANDALONE_BATCH_KIND,
    schemaVersion: HUB_EVIDENCE_LIVE_STANDALONE_BATCH_SCHEMA_VERSION,
    ok: batch.ok === true,
    profiles: batch.results ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runEvidenceLiveStandaloneBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
