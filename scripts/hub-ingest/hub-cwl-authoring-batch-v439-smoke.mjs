#!/usr/bin/env node
/** Full-stack authoring batch v439 (G5687): v438 + post-439 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV438Smoke } from "./hub-cwl-authoring-batch-v438-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost439GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V439_KIND = "chrysalis.hub.cwl-authoring-batch-v439";
export const HUB_CWL_AUTHORING_BATCH_V439_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV439Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV438 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV438Smoke(resolvePriorBatchOpts(opts, 438));
  const gate439 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost439GraduationGate({ repoRoot });
  const ok = batchV438.ok === true && gate439.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V439_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V439_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate439Mode: skipPrior ? "evidence-trend" : "post439-graduation",
    batchV438,
    gate439,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV439Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
