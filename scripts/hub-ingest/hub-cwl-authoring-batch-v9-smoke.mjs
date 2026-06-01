#!/usr/bin/env node
/**
 * Full-stack authoring batch v9 (G1244): v8 + Form-action hole catalog gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV8Smoke } from "./hub-cwl-authoring-batch-v8-smoke.mjs";
import { runFormHoleCatalogGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V9_KIND = "chrysalis.hub.cwl-authoring-batch-v9";
export const HUB_CWL_AUTHORING_BATCH_V9_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV9Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV8 = await runCwlAuthoringBatchV8Smoke({ repoRoot });
  const gate9 = await runFormHoleCatalogGate();
  const ok = batchV8.ok === true && gate9.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V9_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V9_SCHEMA_VERSION,
    ok,
    batchV8,
    gate9,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV9Smoke();
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
