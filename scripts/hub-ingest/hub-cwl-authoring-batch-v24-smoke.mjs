#!/usr/bin/env node
/**
 * Full-stack authoring batch v24 (G1393): v23 + SvelteKit deep search query export.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV23Smoke } from "./hub-cwl-authoring-batch-v23-smoke.mjs";
import { runSvelteSearchQueryExportGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V24_KIND = "chrysalis.hub.cwl-authoring-batch-v24";
export const HUB_CWL_AUTHORING_BATCH_V24_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV24Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV23 = await runCwlAuthoringBatchV23Smoke({ repoRoot });
  const gate24 = await runSvelteSearchQueryExportGate();
  const ok = batchV23.ok === true && gate24.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V24_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V24_SCHEMA_VERSION,
    ok,
    batchV23,
    gate24,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV24Smoke();
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
