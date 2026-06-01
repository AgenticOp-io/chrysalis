#!/usr/bin/env node
/**
 * Full-stack authoring batch v41 (G1561): v40 + Full-stack flagship pilot smoke.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV40Smoke } from "./hub-cwl-authoring-batch-v40-smoke.mjs";
import { runCwlFullstackFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V41_KIND = "chrysalis.hub.cwl-authoring-batch-v41";
export const HUB_CWL_AUTHORING_BATCH_V41_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV41Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV40 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV40Smoke({ ...opts, repoRoot });
  const gate41 = await runCwlFullstackFlagshipGate({ repoRoot });
  const ok = batchV40.ok === true && gate41.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V41_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V41_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV40,
    gate41,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV41Smoke();
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
