#!/usr/bin/env node
/**
 * Full-stack authoring batch v18 (G1334): v17 + Full-stack hole budget v2 sidecar.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV17Smoke } from "./hub-cwl-authoring-batch-v17-smoke.mjs";
import { runHoleBudgetV2Gate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V18_KIND = "chrysalis.hub.cwl-authoring-batch-v18";
export const HUB_CWL_AUTHORING_BATCH_V18_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV18Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV17 = await runCwlAuthoringBatchV17Smoke({ repoRoot });
  const gate18 = await runHoleBudgetV2Gate();
  const ok = batchV17.ok === true && gate18.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V18_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V18_SCHEMA_VERSION,
    ok,
    batchV17,
    gate18,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV18Smoke();
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
