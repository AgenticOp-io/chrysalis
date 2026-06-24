#!/usr/bin/env node
/** Full-stack authoring batch v448 (G5777): v447 + post-448 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV447Smoke } from "./hub-cwl-authoring-batch-v447-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost448GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V448_KIND = "chrysalis.hub.cwl-authoring-batch-v448";
export const HUB_CWL_AUTHORING_BATCH_V448_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV448Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV447 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV447Smoke(resolvePriorBatchOpts(opts, 447));
  const gate448 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost448GraduationGate({ repoRoot });
  const ok = batchV447.ok === true && gate448.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V448_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V448_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate448Mode: skipPrior ? "evidence-trend" : "post448-graduation",
    batchV447,
    gate448,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV448Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
