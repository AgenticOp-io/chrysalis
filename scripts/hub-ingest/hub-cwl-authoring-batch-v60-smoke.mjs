#!/usr/bin/env node
/**
 * Full-stack authoring batch v60 (G1751): v59 + CWL verify-gaps graduation lock.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV59Smoke } from "./hub-cwl-authoring-batch-v59-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost50CompositeGate, runPost50GraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V60_KIND = "chrysalis.hub.cwl-authoring-batch-v60";
export const HUB_CWL_AUTHORING_BATCH_V60_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV60Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV59 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV59Smoke(resolvePriorBatchOpts(opts, 59));
  const gate60 = skipPrior
    ? await runPost50CompositeGate({ repoRoot })
    : await runPost50GraduationGate({ repoRoot });
  const ok = batchV59.ok === true && gate60.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V60_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V60_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate60Mode: skipPrior ? "post50-composite" : "post50-graduation",
    batchV59,
    gate60,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV60Smoke();
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
