#!/usr/bin/env node
/** Full-stack authoring batch v197 (G3269): v196 + Post-125 Phase C graduation lock replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV196Smoke } from "./hub-cwl-authoring-batch-v196-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost197GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V197_KIND = "chrysalis.hub.cwl-authoring-batch-v197";
export const HUB_CWL_AUTHORING_BATCH_V197_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV197Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV196 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV196Smoke(resolvePriorBatchOpts(opts, 196));
  const gate197 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost197GraduationGate({ repoRoot });
  const ok = batchV196.ok === true && gate197.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V197_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V197_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate197Mode: skipPrior ? "evidence-trend" : "post197-graduation",
    batchV196,
    gate197,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV197Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
