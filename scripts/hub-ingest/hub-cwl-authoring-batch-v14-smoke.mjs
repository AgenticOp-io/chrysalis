#!/usr/bin/env node
/**
 * Full-stack authoring batch v14 (G1294): v13 + Delivery dashboard interpolation metric.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV13Smoke } from "./hub-cwl-authoring-batch-v13-smoke.mjs";
import { runDeliveryInterpolationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V14_KIND = "chrysalis.hub.cwl-authoring-batch-v14";
export const HUB_CWL_AUTHORING_BATCH_V14_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV14Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV13 = await runCwlAuthoringBatchV13Smoke({ repoRoot });
  const gate14 = await runDeliveryInterpolationGate({ repoRoot });
  const ok = batchV13.ok === true && gate14.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V14_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V14_SCHEMA_VERSION,
    ok,
    batchV13,
    gate14,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV14Smoke();
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
