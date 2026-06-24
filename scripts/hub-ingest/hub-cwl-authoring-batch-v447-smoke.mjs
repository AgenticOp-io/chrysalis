#!/usr/bin/env node
/** Full-stack authoring batch v447 (G5767): v446 + post-447 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV446Smoke } from "./hub-cwl-authoring-batch-v446-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost447GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V447_KIND = "chrysalis.hub.cwl-authoring-batch-v447";
export const HUB_CWL_AUTHORING_BATCH_V447_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV447Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV446 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV446Smoke(resolvePriorBatchOpts(opts, 446));
  const gate447 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost447GraduationGate({ repoRoot });
  const ok = batchV446.ok === true && gate447.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V447_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V447_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate447Mode: skipPrior ? "evidence-trend" : "post447-graduation",
    batchV446,
    gate447,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV447Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
