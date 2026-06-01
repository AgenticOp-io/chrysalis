#!/usr/bin/env node
/**
 * Full-stack authoring batch v49 (G1641): v48 + Dual-backend HTTP emit verify mega.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV48Smoke } from "./hub-cwl-authoring-batch-v48-smoke.mjs";
import { runEmitVerifyMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V49_KIND = "chrysalis.hub.cwl-authoring-batch-v49";
export const HUB_CWL_AUTHORING_BATCH_V49_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV49Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV48 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV48Smoke({ ...opts, repoRoot });
  const gate49 = await runEmitVerifyMegaGate({ repoRoot });
  const ok = batchV48.ok === true && gate49.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V49_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V49_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV48,
    gate49,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV49Smoke();
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
