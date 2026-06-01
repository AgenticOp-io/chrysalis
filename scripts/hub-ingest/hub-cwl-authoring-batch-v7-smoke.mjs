#!/usr/bin/env node
/**
 * Full-stack authoring batch v7 (G1224): v6 + Load literal-array partial lift.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV6Smoke } from "./hub-cwl-authoring-batch-v6-smoke.mjs";
import { runLoadArrayGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V7_KIND = "chrysalis.hub.cwl-authoring-batch-v7";
export const HUB_CWL_AUTHORING_BATCH_V7_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV7Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV6 = await runCwlAuthoringBatchV6Smoke({ repoRoot });
  const gate7 = await runLoadArrayGate({ repoRoot });
  const ok = batchV6.ok === true && gate7.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V7_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V7_SCHEMA_VERSION,
    ok,
    batchV6,
    gate7,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV7Smoke();
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
