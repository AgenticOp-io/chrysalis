#!/usr/bin/env node
/**
 * Full-stack authoring batch v16 (G1314): v15 + Next.js search query page origin.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV15Smoke } from "./hub-cwl-authoring-batch-v15-smoke.mjs";
import { runNextjsSearchGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V16_KIND = "chrysalis.hub.cwl-authoring-batch-v16";
export const HUB_CWL_AUTHORING_BATCH_V16_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV16Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV15 = await runCwlAuthoringBatchV15Smoke({ repoRoot });
  const gate16 = await runNextjsSearchGate({ repoRoot });
  const ok = batchV15.ok === true && gate16.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V16_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V16_SCHEMA_VERSION,
    ok,
    batchV15,
    gate16,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV16Smoke();
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
