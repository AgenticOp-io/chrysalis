#!/usr/bin/env node
/**
 * Full-stack authoring batch v54 (G1691): v53 + Full-stack flagship pilot replay.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV53Smoke } from "./hub-cwl-authoring-batch-v53-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runCwlFullstackFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V54_KIND = "chrysalis.hub.cwl-authoring-batch-v54";
export const HUB_CWL_AUTHORING_BATCH_V54_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV54Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV53 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV53Smoke(resolvePriorBatchOpts(opts, 53));
  const gate54 = await runCwlFullstackFlagshipGate({ repoRoot });
  const ok = batchV53.ok === true && gate54.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V54_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V54_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV53,
    gate54,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV54Smoke();
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
