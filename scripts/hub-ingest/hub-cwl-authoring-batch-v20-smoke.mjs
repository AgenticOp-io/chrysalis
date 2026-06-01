#!/usr/bin/env node
/**
 * Full-stack authoring batch v20 (G1354): v19 + Full-stack CWL graduation gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV19Smoke } from "./hub-cwl-authoring-batch-v19-smoke.mjs";
import { runGraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V20_KIND = "chrysalis.hub.cwl-authoring-batch-v20";
export const HUB_CWL_AUTHORING_BATCH_V20_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV20Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV19 = await runCwlAuthoringBatchV19Smoke({ repoRoot });
  const gate20 = await runGraduationGate({ repoRoot });
  const ok = batchV19.ok === true && gate20.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V20_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V20_SCHEMA_VERSION,
    ok,
    batchV19,
    gate20,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV20Smoke();
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
