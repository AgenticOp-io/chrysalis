#!/usr/bin/env node
/**
 * Full-stack authoring batch v58 (G1731): v57 + Dual-backend emit verify mega.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV57Smoke } from "./hub-cwl-authoring-batch-v57-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runEmitVerifyMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V58_KIND = "chrysalis.hub.cwl-authoring-batch-v58";
export const HUB_CWL_AUTHORING_BATCH_V58_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV58Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV57 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV57Smoke(resolvePriorBatchOpts(opts, 57));
  const gate58 = await runEmitVerifyMegaGate({ repoRoot });
  const ok = batchV57.ok === true && gate58.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V58_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V58_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV57,
    gate58,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV58Smoke();
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
