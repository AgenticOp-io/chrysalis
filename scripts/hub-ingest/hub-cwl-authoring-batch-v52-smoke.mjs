#!/usr/bin/env node
/**
 * Full-stack authoring batch v52 (G1671): v51 + Flagship CWL verify-gaps ingest report.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV51Smoke } from "./hub-cwl-authoring-batch-v51-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runVerifyGapsFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V52_KIND = "chrysalis.hub.cwl-authoring-batch-v52";
export const HUB_CWL_AUTHORING_BATCH_V52_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV52Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV51 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV51Smoke(resolvePriorBatchOpts(opts, 51));
  const gate52 = await runVerifyGapsFullstackGate({ repoRoot });
  const ok = batchV51.ok === true && gate52.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V52_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V52_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV51,
    gate52,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV52Smoke();
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
