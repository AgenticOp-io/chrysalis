#!/usr/bin/env node
/**
 * Full-stack authoring batch v29 (G1443): v28 + Cross-backend emit verify mega batch.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV28Smoke } from "./hub-cwl-authoring-batch-v28-smoke.mjs";
import { runEmitVerifyMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V29_KIND = "chrysalis.hub.cwl-authoring-batch-v29";
export const HUB_CWL_AUTHORING_BATCH_V29_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV29Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV28 = await runCwlAuthoringBatchV28Smoke({ repoRoot });
  const gate29 = await runEmitVerifyMegaGate({ repoRoot });
  const ok = batchV28.ok === true && gate29.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V29_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V29_SCHEMA_VERSION,
    ok,
    batchV28,
    gate29,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV29Smoke();
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
