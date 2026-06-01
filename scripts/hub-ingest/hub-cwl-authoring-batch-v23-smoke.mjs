#!/usr/bin/env node
/**
 * Full-stack authoring batch v23 (G1383): v22 + Next.js deep searchParams CWL export.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV22Smoke } from "./hub-cwl-authoring-batch-v22-smoke.mjs";
import { runNextjsSearchParamsExportGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V23_KIND = "chrysalis.hub.cwl-authoring-batch-v23";
export const HUB_CWL_AUTHORING_BATCH_V23_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV23Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV22 = await runCwlAuthoringBatchV22Smoke({ repoRoot });
  const gate23 = await runNextjsSearchParamsExportGate();
  const ok = batchV22.ok === true && gate23.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V23_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V23_SCHEMA_VERSION,
    ok,
    batchV22,
    gate23,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV23Smoke();
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
