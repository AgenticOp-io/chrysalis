#!/usr/bin/env node
/**
 * Full-stack authoring batch v10 (G1254): v9 + CWL diagnose full-stack summary.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV9Smoke } from "./hub-cwl-authoring-batch-v9-smoke.mjs";
import { runDiagnoseFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V10_KIND = "chrysalis.hub.cwl-authoring-batch-v10";
export const HUB_CWL_AUTHORING_BATCH_V10_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV10Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV9 = await runCwlAuthoringBatchV9Smoke({ repoRoot });
  const gate10 = await runDiagnoseFullstackGate({ repoRoot });
  const ok = batchV9.ok === true && gate10.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V10_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V10_SCHEMA_VERSION,
    ok,
    batchV9,
    gate10,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV10Smoke();
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
