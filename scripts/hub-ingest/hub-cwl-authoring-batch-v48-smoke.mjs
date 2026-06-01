#!/usr/bin/env node
/**
 * Full-stack authoring batch v48 (G1631): v47 + Post-40 flagship + migration OS composite.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV47Smoke } from "./hub-cwl-authoring-batch-v47-smoke.mjs";
import { runPost40CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V48_KIND = "chrysalis.hub.cwl-authoring-batch-v48";
export const HUB_CWL_AUTHORING_BATCH_V48_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV48Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV47 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV47Smoke({ ...opts, repoRoot });
  const gate48 = await runPost40CompositeGate({ repoRoot });
  const ok = batchV47.ok === true && gate48.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V48_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V48_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV47,
    gate48,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV48Smoke();
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
