#!/usr/bin/env node
/**
 * Full-stack authoring batch v57 (G1721): v56 + Post-50 CWL verify-gaps composite.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV56Smoke } from "./hub-cwl-authoring-batch-v56-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost50CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V57_KIND = "chrysalis.hub.cwl-authoring-batch-v57";
export const HUB_CWL_AUTHORING_BATCH_V57_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV57Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV56 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV56Smoke(resolvePriorBatchOpts(opts, 56));
  const gate57 = await runPost50CompositeGate({ repoRoot });
  const ok = batchV56.ok === true && gate57.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V57_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V57_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV56,
    gate57,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV57Smoke();
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
