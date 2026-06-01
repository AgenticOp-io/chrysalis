#!/usr/bin/env node
/**
 * Full-stack authoring batch v45 (G1601): v44 + CWL preview on flagship fullstack.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV44Smoke } from "./hub-cwl-authoring-batch-v44-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runCwlPreviewFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V45_KIND = "chrysalis.hub.cwl-authoring-batch-v45";
export const HUB_CWL_AUTHORING_BATCH_V45_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV45Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV44 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV44Smoke(resolvePriorBatchOpts(opts, 44));
  const gate45 = await runCwlPreviewFlagshipGate({ repoRoot });
  const ok = batchV44.ok === true && gate45.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V45_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V45_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV44,
    gate45,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV45Smoke();
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
