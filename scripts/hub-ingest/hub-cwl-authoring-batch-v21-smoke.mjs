#!/usr/bin/env node
/**
 * Full-stack authoring batch v21 (G1363): v20 + production search query probes (RFC-0015).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV20Smoke } from "./hub-cwl-authoring-batch-v20-smoke.mjs";
import { runProductionSearchGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V21_KIND = "chrysalis.hub.cwl-authoring-batch-v21";
export const HUB_CWL_AUTHORING_BATCH_V21_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV21Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV20 = await runCwlAuthoringBatchV20Smoke({ repoRoot });
  const gate21 = await runProductionSearchGate({ repoRoot });
  const ok = batchV20.ok === true && gate21.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V21_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V21_SCHEMA_VERSION,
    ok,
    batchV20,
    gate21,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV21Smoke();
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
