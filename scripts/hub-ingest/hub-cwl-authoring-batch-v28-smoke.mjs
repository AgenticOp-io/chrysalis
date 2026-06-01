#!/usr/bin/env node
/**
 * Full-stack authoring batch v28 (G1433): v27 + CWL diagnose v2 effect summary.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV27Smoke } from "./hub-cwl-authoring-batch-v27-smoke.mjs";
import { runDiagnoseV2Gate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V28_KIND = "chrysalis.hub.cwl-authoring-batch-v28";
export const HUB_CWL_AUTHORING_BATCH_V28_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV28Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV27 = await runCwlAuthoringBatchV27Smoke({ repoRoot });
  const gate28 = await runDiagnoseV2Gate();
  const ok = batchV27.ok === true && gate28.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V28_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V28_SCHEMA_VERSION,
    ok,
    batchV27,
    gate28,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV28Smoke();
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
