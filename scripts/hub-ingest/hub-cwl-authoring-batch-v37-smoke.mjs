#!/usr/bin/env node
/**
 * Full-stack authoring batch v37 (G1521): v36 + Cross-origin mega (flagship + deep).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV36Smoke } from "./hub-cwl-authoring-batch-v36-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runMegaOriginGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V37_KIND = "chrysalis.hub.cwl-authoring-batch-v37";
export const HUB_CWL_AUTHORING_BATCH_V37_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV37Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV36 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV36Smoke(resolvePriorBatchOpts(opts, 36));
  const gate37 = await runMegaOriginGate({ repoRoot });
  const ok = batchV36.ok === true && gate37.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V37_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V37_SCHEMA_VERSION,
    ok,
    batchV36,
    gate37,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV37Smoke();
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
