#!/usr/bin/env node
/** Full-stack authoring batch v217 (G3469): v216 + Phase D graduation lock (hub ops mega) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV216Smoke } from "./hub-cwl-authoring-batch-v216-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost217GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V217_KIND = "chrysalis.hub.cwl-authoring-batch-v217";
export const HUB_CWL_AUTHORING_BATCH_V217_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV217Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV216 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV216Smoke(resolvePriorBatchOpts(opts, 216));
  const gate217 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost217GraduationGate({ repoRoot });
  const ok = batchV216.ok === true && gate217.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V217_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V217_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate217Mode: skipPrior ? "evidence-trend" : "post217-graduation",
    batchV216,
    gate217,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV217Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
