#!/usr/bin/env node
/**
 * Full-stack authoring batch v35 (G1501): v34 + project-to-CWL origin roundtrip.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV34Smoke } from "./hub-cwl-authoring-batch-v34-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runProjectToCwlRoundtripGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V35_KIND = "chrysalis.hub.cwl-authoring-batch-v35";
export const HUB_CWL_AUTHORING_BATCH_V35_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV35Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV34 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV34Smoke(resolvePriorBatchOpts(opts, 34));
  const gate35 = await runProjectToCwlRoundtripGate({ repoRoot });
  const ok = batchV34.ok === true && gate35.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V35_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V35_SCHEMA_VERSION,
    ok,
    batchV34,
    gate35,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV35Smoke();
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
