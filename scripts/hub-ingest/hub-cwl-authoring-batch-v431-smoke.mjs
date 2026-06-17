#!/usr/bin/env node
/** Full-stack authoring batch v431 (G5609): v430 + Phase D graduation lock (hub ops mega) replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV430Smoke } from "./hub-cwl-authoring-batch-v430-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost431GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V431_KIND = "chrysalis.hub.cwl-authoring-batch-v431";
export const HUB_CWL_AUTHORING_BATCH_V431_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV431Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV430 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV430Smoke(resolvePriorBatchOpts(opts, 430));
  const gate431 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost431GraduationGate({ repoRoot });
  const ok = batchV430.ok === true && gate431.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V431_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V431_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate431Mode: skipPrior ? "evidence-trend" : "post431-graduation",
    batchV430,
    gate431,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV431Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
