#!/usr/bin/env node
/**
 * Full-stack authoring batch v26 (G1413): v25 + Runtime session stub production gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV25Smoke } from "./hub-cwl-authoring-batch-v25-smoke.mjs";
import { runSessionStubGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V26_KIND = "chrysalis.hub.cwl-authoring-batch-v26";
export const HUB_CWL_AUTHORING_BATCH_V26_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV26Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV25 = await runCwlAuthoringBatchV25Smoke({ repoRoot });
  const gate26 = await runSessionStubGate({ repoRoot });
  const ok = batchV25.ok === true && gate26.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V26_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V26_SCHEMA_VERSION,
    ok,
    batchV25,
    gate26,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV26Smoke();
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
