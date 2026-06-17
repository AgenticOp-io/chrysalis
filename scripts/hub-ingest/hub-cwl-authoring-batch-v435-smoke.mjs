#!/usr/bin/env node
/** Full-stack authoring batch v435 (G5649): v434 + Post-66 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV434Smoke } from "./hub-cwl-authoring-batch-v434-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost435GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V435_KIND = "chrysalis.hub.cwl-authoring-batch-v435";
export const HUB_CWL_AUTHORING_BATCH_V435_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV435Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV434 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV434Smoke(resolvePriorBatchOpts(opts, 434));
  const gate435 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost435GraduationGate({ repoRoot });
  const ok = batchV434.ok === true && gate435.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V435_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V435_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate435Mode: skipPrior ? "evidence-trend" : "post435-graduation",
    batchV434,
    gate435,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV435Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
