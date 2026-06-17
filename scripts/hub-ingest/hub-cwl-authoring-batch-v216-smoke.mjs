#!/usr/bin/env node
/** Full-stack authoring batch v216 (G3459): v215 + Month-23 graduation + post-89 lock replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV215Smoke } from "./hub-cwl-authoring-batch-v215-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost216GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V216_KIND = "chrysalis.hub.cwl-authoring-batch-v216";
export const HUB_CWL_AUTHORING_BATCH_V216_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV216Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV215 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV215Smoke(resolvePriorBatchOpts(opts, 215));
  const gate216 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost216GraduationGate({ repoRoot });
  const ok = batchV215.ok === true && gate216.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V216_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V216_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate216Mode: skipPrior ? "evidence-trend" : "post216-graduation",
    batchV215,
    gate216,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV216Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
