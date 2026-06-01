#!/usr/bin/env node
/**
 * Full-stack authoring batch v36 (G1511): v35 + Full-stack graduation gate replay (v6–v20).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV35Smoke } from "./hub-cwl-authoring-batch-v35-smoke.mjs";
import { runGraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V36_KIND = "chrysalis.hub.cwl-authoring-batch-v36";
export const HUB_CWL_AUTHORING_BATCH_V36_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV36Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV35 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV35Smoke({
        ...opts,
        
      });
  const gate36 = await runGraduationGate({ repoRoot });
  const ok = batchV35.ok === true && gate36.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V36_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V36_SCHEMA_VERSION,
    ok,
    batchV35,
    gate36,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV36Smoke();
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
