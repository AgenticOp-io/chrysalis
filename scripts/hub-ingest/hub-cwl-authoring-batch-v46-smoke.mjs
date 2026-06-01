#!/usr/bin/env node
/**
 * Full-stack authoring batch v46 (G1611): v45 + OpenAPI page surfaces export.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV45Smoke } from "./hub-cwl-authoring-batch-v45-smoke.mjs";
import { runOpenapiPageGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V46_KIND = "chrysalis.hub.cwl-authoring-batch-v46";
export const HUB_CWL_AUTHORING_BATCH_V46_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV46Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV45 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV45Smoke({ ...opts, repoRoot });
  const gate46 = await runOpenapiPageGate({ repoRoot });
  const ok = batchV45.ok === true && gate46.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V46_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V46_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    
    batchV45,
    gate46,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV46Smoke();
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
