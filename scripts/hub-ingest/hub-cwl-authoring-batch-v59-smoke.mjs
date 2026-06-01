#!/usr/bin/env node
/**
 * Full-stack authoring batch v59 (G1741): v58 + Dual-backend emit verify mega (CWL flagship).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV58Smoke } from "./hub-cwl-authoring-batch-v58-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runEmitVerifyMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V59_KIND = "chrysalis.hub.cwl-authoring-batch-v59";
export const HUB_CWL_AUTHORING_BATCH_V59_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV59Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV58 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV58Smoke(resolvePriorBatchOpts(opts, 58));
  const gate59 = await runEmitVerifyMegaGate({ repoRoot });
  const ok = batchV58.ok === true && gate59.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V59_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V59_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV58,
    gate59,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV59Smoke();
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
