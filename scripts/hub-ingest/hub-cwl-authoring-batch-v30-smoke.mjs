#!/usr/bin/env node
/**
 * Full-stack authoring batch v30 (G1453): v29 + Phase 6 production-readiness graduation.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV29Smoke } from "./hub-cwl-authoring-batch-v29-smoke.mjs";
import { runProductionGraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V30_KIND = "chrysalis.hub.cwl-authoring-batch-v30";
export const HUB_CWL_AUTHORING_BATCH_V30_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV30Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const batchV29 = await runCwlAuthoringBatchV29Smoke({ repoRoot });
  const gate30 = await runProductionGraduationGate({ repoRoot });
  const ok = batchV29.ok === true && gate30.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V30_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V30_SCHEMA_VERSION,
    ok,
    batchV29,
    gate30,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV30Smoke();
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
