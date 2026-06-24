#!/usr/bin/env node
/** Full-stack authoring batch v444 (G5737): v443 + post-444 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV443Smoke } from "./hub-cwl-authoring-batch-v443-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost444GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V444_KIND = "chrysalis.hub.cwl-authoring-batch-v444";
export const HUB_CWL_AUTHORING_BATCH_V444_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV444Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV443 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV443Smoke(resolvePriorBatchOpts(opts, 443));
  const gate444 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost444GraduationGate({ repoRoot });
  const ok = batchV443.ok === true && gate444.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V444_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V444_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate444Mode: skipPrior ? "evidence-trend" : "post444-graduation",
    batchV443,
    gate444,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV444Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
