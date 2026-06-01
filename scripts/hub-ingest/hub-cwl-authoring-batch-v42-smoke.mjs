#!/usr/bin/env node
/**
 * Full-stack authoring batch v42 (G1571): v41 + Delivery dashboard interpolation gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV41Smoke } from "./hub-cwl-authoring-batch-v41-smoke.mjs";
import { runDeliveryInterpolationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V42_KIND = "chrysalis.hub.cwl-authoring-batch-v42";
export const HUB_CWL_AUTHORING_BATCH_V42_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV42Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV41 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV41Smoke({ ...opts, repoRoot });
  const gate42 = await runDeliveryInterpolationGate({ repoRoot });
  const ok = batchV41.ok === true && gate42.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V42_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V42_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV41,
    gate42,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV42Smoke();
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
