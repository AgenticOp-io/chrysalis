#!/usr/bin/env node
/**
 * Full-stack authoring batch v32 (G1471): v31 + runtime-cwl production readiness probes.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV31Smoke } from "./hub-cwl-authoring-batch-v31-smoke.mjs";
import { runRuntimeProductionGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V32_KIND = "chrysalis.hub.cwl-authoring-batch-v32";
export const HUB_CWL_AUTHORING_BATCH_V32_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV32Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV31 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV31Smoke({
        ...opts,
        
      });
  const gate32 = await runRuntimeProductionGate({ repoRoot });
  const ok = batchV31.ok === true && gate32.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V32_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V32_SCHEMA_VERSION,
    ok,
    batchV31,
    gate32,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV32Smoke();
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
