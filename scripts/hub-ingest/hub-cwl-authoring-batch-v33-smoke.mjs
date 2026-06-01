#!/usr/bin/env node
/**
 * Full-stack authoring batch v33 (G1481): v32 + Express verify-gaps ingest bridge.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV32Smoke } from "./hub-cwl-authoring-batch-v32-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runVerifyGapsExpressGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V33_KIND = "chrysalis.hub.cwl-authoring-batch-v33";
export const HUB_CWL_AUTHORING_BATCH_V33_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV33Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV32 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV32Smoke(resolvePriorBatchOpts(opts, 32));
  const gate33 = await runVerifyGapsExpressGate({ repoRoot });
  const ok = batchV32.ok === true && gate33.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V33_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V33_SCHEMA_VERSION,
    ok,
    batchV32,
    gate33,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV33Smoke();
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
