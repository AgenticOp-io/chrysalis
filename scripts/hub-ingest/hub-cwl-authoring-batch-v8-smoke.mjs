#!/usr/bin/env node
/**
 * Full-stack authoring batch v8 (G1234): v7 + Layout-wrapped page routes.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV7Smoke } from "./hub-cwl-authoring-batch-v7-smoke.mjs";
import { runLayoutSearchGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V8_KIND = "chrysalis.hub.cwl-authoring-batch-v8";
export const HUB_CWL_AUTHORING_BATCH_V8_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV8Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV7 = await runCwlAuthoringBatchV7Smoke({ repoRoot });
  const gate8 = await runLayoutSearchGate();
  const ok = batchV7.ok === true && gate8.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V8_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V8_SCHEMA_VERSION,
    ok,
    batchV7,
    gate8,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV8Smoke();
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
