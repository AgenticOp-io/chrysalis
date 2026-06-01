#!/usr/bin/env node
/**
 * Full-stack authoring batch v13 (G1284): v12 + Bootstrap template v2 (search+blog).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV12Smoke } from "./hub-cwl-authoring-batch-v12-smoke.mjs";
import { runBootstrapV2Gate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V13_KIND = "chrysalis.hub.cwl-authoring-batch-v13";
export const HUB_CWL_AUTHORING_BATCH_V13_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV13Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV12 = await runCwlAuthoringBatchV12Smoke({ repoRoot });
  const gate13 = await runBootstrapV2Gate({ repoRoot });
  const ok = batchV12.ok === true && gate13.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V13_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V13_SCHEMA_VERSION,
    ok,
    batchV12,
    gate13,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV13Smoke();
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
