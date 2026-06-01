#!/usr/bin/env node
/**
 * Full-stack authoring batch v47 (G1621): v46 + Post-30 runtime + verify-gaps composite replay.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV46Smoke } from "./hub-cwl-authoring-batch-v46-smoke.mjs";
import { runPost30CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V47_KIND = "chrysalis.hub.cwl-authoring-batch-v47";
export const HUB_CWL_AUTHORING_BATCH_V47_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV47Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV46 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV46Smoke({ ...opts, repoRoot });
  const gate47 = await runPost30CompositeGate({ repoRoot });
  const ok = batchV46.ok === true && gate47.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V47_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V47_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV46,
    gate47,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV47Smoke();
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
