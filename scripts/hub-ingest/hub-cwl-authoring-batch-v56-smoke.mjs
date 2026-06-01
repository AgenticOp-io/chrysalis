#!/usr/bin/env node
/**
 * Full-stack authoring batch v56 (G1711): v55 + Post-30 runtime composite replay.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV55Smoke } from "./hub-cwl-authoring-batch-v55-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost30CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V56_KIND = "chrysalis.hub.cwl-authoring-batch-v56";
export const HUB_CWL_AUTHORING_BATCH_V56_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV56Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV55 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV55Smoke(resolvePriorBatchOpts(opts, 55));
  const gate56 = await runPost30CompositeGate({ repoRoot });
  const ok = batchV55.ok === true && gate56.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V56_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V56_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV55,
    gate56,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV56Smoke();
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
