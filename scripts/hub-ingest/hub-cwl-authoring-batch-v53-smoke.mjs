#!/usr/bin/env node
/**
 * Full-stack authoring batch v53 (G1681): v52 + CWL fullstack verify-gaps remediation action.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV52Smoke } from "./hub-cwl-authoring-batch-v52-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runVerifyGapsFullstackActionGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V53_KIND = "chrysalis.hub.cwl-authoring-batch-v53";
export const HUB_CWL_AUTHORING_BATCH_V53_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV53Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV52 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV52Smoke(resolvePriorBatchOpts(opts, 52));
  const gate53 = await runVerifyGapsFullstackActionGate({ repoRoot });
  const ok = batchV52.ok === true && gate53.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V53_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V53_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV52,
    gate53,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV53Smoke();
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
