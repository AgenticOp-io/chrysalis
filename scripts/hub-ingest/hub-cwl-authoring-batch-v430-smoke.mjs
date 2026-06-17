#!/usr/bin/env node
/** Full-stack authoring batch v430 (G5599): v429 + Month-23 graduation + post-89 lock replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV429Smoke } from "./hub-cwl-authoring-batch-v429-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost430GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V430_KIND = "chrysalis.hub.cwl-authoring-batch-v430";
export const HUB_CWL_AUTHORING_BATCH_V430_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV430Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV429 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV429Smoke(resolvePriorBatchOpts(opts, 429));
  const gate430 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost430GraduationGate({ repoRoot });
  const ok = batchV429.ok === true && gate430.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V430_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V430_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate430Mode: skipPrior ? "evidence-trend" : "post430-graduation",
    batchV429,
    gate430,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV430Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
