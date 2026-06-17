#!/usr/bin/env node
/** Full-stack authoring batch v266 (G3959): v265 + Post-122 diagnose + scope + formatter replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV265Smoke } from "./hub-cwl-authoring-batch-v265-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost266GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V266_KIND = "chrysalis.hub.cwl-authoring-batch-v266";
export const HUB_CWL_AUTHORING_BATCH_V266_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV266Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV265 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV265Smoke(resolvePriorBatchOpts(opts, 265));
  const gate266 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost266GraduationGate({ repoRoot });
  const ok = batchV265.ok === true && gate266.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V266_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V266_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate266Mode: skipPrior ? "evidence-trend" : "post266-graduation",
    batchV265,
    gate266,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV266Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
