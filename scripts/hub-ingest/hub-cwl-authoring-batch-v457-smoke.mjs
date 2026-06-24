#!/usr/bin/env node
/** Full-stack authoring batch v457 (G5867): v456 + post-457 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV456Smoke } from "./hub-cwl-authoring-batch-v456-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost457GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V457_KIND = "chrysalis.hub.cwl-authoring-batch-v457";
export const HUB_CWL_AUTHORING_BATCH_V457_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV457Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV456 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV456Smoke(resolvePriorBatchOpts(opts, 456));
  const gate457 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost457GraduationGate({ repoRoot });
  const ok = batchV456.ok === true && gate457.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V457_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V457_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate457Mode: skipPrior ? "evidence-trend" : "post457-graduation",
    batchV456,
    gate457,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV457Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
