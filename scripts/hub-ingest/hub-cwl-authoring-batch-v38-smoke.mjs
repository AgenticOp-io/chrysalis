#!/usr/bin/env node
/**
 * Full-stack authoring batch v38 (G1531): v37 + Post-30 runtime + verify-gaps composite.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV37Smoke } from "./hub-cwl-authoring-batch-v37-smoke.mjs";
import { runPost30CompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V38_KIND = "chrysalis.hub.cwl-authoring-batch-v38";
export const HUB_CWL_AUTHORING_BATCH_V38_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV38Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV37 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV37Smoke({
        ...opts,
        
      });
  const gate38 = await runPost30CompositeGate({ repoRoot });
  const ok = batchV37.ok === true && gate38.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V38_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V38_SCHEMA_VERSION,
    ok,
    batchV37,
    gate38,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV38Smoke();
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
