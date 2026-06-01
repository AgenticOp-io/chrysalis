#!/usr/bin/env node
/**
 * Full-stack authoring batch v50 (G1651): v49 + Post-40 full-stack graduation lock.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV49Smoke } from "./hub-cwl-authoring-batch-v49-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost40CompositeGate, runPost40GraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V50_KIND = "chrysalis.hub.cwl-authoring-batch-v50";
export const HUB_CWL_AUTHORING_BATCH_V50_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV50Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV49 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV49Smoke(resolvePriorBatchOpts(opts, 49));
  const gate50 = skipPrior
    ? await runPost40CompositeGate({ repoRoot })
    : await runPost40GraduationGate({ repoRoot });
  const ok = batchV49.ok === true && gate50.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V50_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V50_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate50Mode: skipPrior ? "post40-composite" : "post40-graduation",
    batchV49,
    gate50,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV50Smoke();
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
