#!/usr/bin/env node
/**
 * Full-stack authoring batch v6 (G1214): v5 + Query param HTML interpolation.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV5Smoke } from "./hub-cwl-authoring-batch-v5-smoke.mjs";
import { runQueryHtmlGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V6_KIND = "chrysalis.hub.cwl-authoring-batch-v6";
export const HUB_CWL_AUTHORING_BATCH_V6_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV6Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV5 = await runCwlAuthoringBatchV5Smoke({ repoRoot });
  const gate6 = await runQueryHtmlGate({ repoRoot });
  const ok = batchV5.ok === true && gate6.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V6_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V6_SCHEMA_VERSION,
    ok,
    batchV5,
    gate6,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV6Smoke();
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
