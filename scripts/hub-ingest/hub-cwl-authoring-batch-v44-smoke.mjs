#!/usr/bin/env node
/**
 * Full-stack authoring batch v44 (G1591): v43 + Verify-gaps ingest remediation action.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV43Smoke } from "./hub-cwl-authoring-batch-v43-smoke.mjs";
import { runVerifyGapsIngestActionGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V44_KIND = "chrysalis.hub.cwl-authoring-batch-v44";
export const HUB_CWL_AUTHORING_BATCH_V44_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV44Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV43 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV43Smoke({ ...opts, repoRoot });
  const gate44 = await runVerifyGapsIngestActionGate({ repoRoot });
  const ok = batchV43.ok === true && gate44.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V44_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V44_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV43,
    gate44,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV44Smoke();
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
