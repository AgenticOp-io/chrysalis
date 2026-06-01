#!/usr/bin/env node
/**
 * Full-stack authoring batch v25 (G1403): v24 + Form-action hole RFC-0016 probe.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV24Smoke } from "./hub-cwl-authoring-batch-v24-smoke.mjs";
import { runFormActionProbeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V25_KIND = "chrysalis.hub.cwl-authoring-batch-v25";
export const HUB_CWL_AUTHORING_BATCH_V25_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV25Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV24 = await runCwlAuthoringBatchV24Smoke({ repoRoot });
  const gate25 = await runFormActionProbeGate();
  const ok = batchV24.ok === true && gate25.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V25_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V25_SCHEMA_VERSION,
    ok,
    batchV24,
    gate25,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV25Smoke();
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
