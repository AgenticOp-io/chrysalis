#!/usr/bin/env node
/**
 * Full-stack authoring batch v27 (G1423): v26 + Express oracle flagship depth slice.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV26Smoke } from "./hub-cwl-authoring-batch-v26-smoke.mjs";
import { runExpressDepthGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V27_KIND = "chrysalis.hub.cwl-authoring-batch-v27";
export const HUB_CWL_AUTHORING_BATCH_V27_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV27Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV26 = await runCwlAuthoringBatchV26Smoke({ repoRoot });
  const gate27 = await runExpressDepthGate();
  const ok = batchV26.ok === true && gate27.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V27_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V27_SCHEMA_VERSION,
    ok,
    batchV26,
    gate27,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV27Smoke();
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
