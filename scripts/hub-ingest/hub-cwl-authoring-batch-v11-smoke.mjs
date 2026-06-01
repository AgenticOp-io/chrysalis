#!/usr/bin/env node
/**
 * Full-stack authoring batch v11 (G1264): v10 + OpenAPI export page surfaces.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV10Smoke } from "./hub-cwl-authoring-batch-v10-smoke.mjs";
import { runOpenapiPageGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V11_KIND = "chrysalis.hub.cwl-authoring-batch-v11";
export const HUB_CWL_AUTHORING_BATCH_V11_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV11Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV10 = await runCwlAuthoringBatchV10Smoke({ repoRoot });
  const gate11 = await runOpenapiPageGate({ repoRoot });
  const ok = batchV10.ok === true && gate11.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V11_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V11_SCHEMA_VERSION,
    ok,
    batchV10,
    gate11,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV11Smoke();
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
