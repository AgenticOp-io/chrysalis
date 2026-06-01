#!/usr/bin/env node
/**
 * Full-stack authoring batch v17 (G1324): v16 + SvelteKit search query page origin.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV16Smoke } from "./hub-cwl-authoring-batch-v16-smoke.mjs";
import { runSvelteSearchGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V17_KIND = "chrysalis.hub.cwl-authoring-batch-v17";
export const HUB_CWL_AUTHORING_BATCH_V17_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV17Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV16 = await runCwlAuthoringBatchV16Smoke({ repoRoot });
  const gate17 = await runSvelteSearchGate({ repoRoot });
  const ok = batchV16.ok === true && gate17.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V17_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V17_SCHEMA_VERSION,
    ok,
    batchV16,
    gate17,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV17Smoke();
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
