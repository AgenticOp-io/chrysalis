#!/usr/bin/env node
/**
 * Full-stack authoring batch v12 (G1274): v11 + Gold verify flagship CWL suite.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV11Smoke } from "./hub-cwl-authoring-batch-v11-smoke.mjs";
import { runGoldFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V12_KIND = "chrysalis.hub.cwl-authoring-batch-v12";
export const HUB_CWL_AUTHORING_BATCH_V12_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV12Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV11 = await runCwlAuthoringBatchV11Smoke({ repoRoot });
  const gate12 = await runGoldFlagshipGate();
  const ok = batchV11.ok === true && gate12.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V12_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V12_SCHEMA_VERSION,
    ok,
    batchV11,
    gate12,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV12Smoke();
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
