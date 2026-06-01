#!/usr/bin/env node
/**
 * Full-stack authoring batch v19 (G1344): v18 + Cross-origin mega batch (flagship+deep).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV18Smoke } from "./hub-cwl-authoring-batch-v18-smoke.mjs";
import { runMegaOriginGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V19_KIND = "chrysalis.hub.cwl-authoring-batch-v19";
export const HUB_CWL_AUTHORING_BATCH_V19_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV19Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV18 = await runCwlAuthoringBatchV18Smoke({ repoRoot });
  const gate19 = await runMegaOriginGate({ repoRoot });
  const ok = batchV18.ok === true && gate19.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V19_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V19_SCHEMA_VERSION,
    ok,
    batchV18,
    gate19,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV19Smoke();
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
