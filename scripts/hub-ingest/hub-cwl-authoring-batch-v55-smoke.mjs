#!/usr/bin/env node
/**
 * Full-stack authoring batch v55 (G1701): v54 + Post-40 migration OS composite replay.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV54Smoke } from "./hub-cwl-authoring-batch-v54-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost40CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V55_KIND = "chrysalis.hub.cwl-authoring-batch-v55";
export const HUB_CWL_AUTHORING_BATCH_V55_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV55Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV54 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV54Smoke(resolvePriorBatchOpts(opts, 54));
  const gate55 = await runPost40CompositeGate({ repoRoot });
  const ok = batchV54.ok === true && gate55.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V55_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V55_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV54,
    gate55,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV55Smoke();
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
