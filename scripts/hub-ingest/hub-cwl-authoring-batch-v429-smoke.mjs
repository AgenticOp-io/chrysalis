#!/usr/bin/env node
/** Full-stack authoring batch v429 (G5589): v428 + Post-78/79 deep export + HTML interp replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV428Smoke } from "./hub-cwl-authoring-batch-v428-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost429GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V429_KIND = "chrysalis.hub.cwl-authoring-batch-v429";
export const HUB_CWL_AUTHORING_BATCH_V429_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV429Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV428 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV428Smoke(resolvePriorBatchOpts(opts, 428));
  const gate429 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost429GraduationGate({ repoRoot });
  const ok = batchV428.ok === true && gate429.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V429_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V429_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate429Mode: skipPrior ? "evidence-trend" : "post429-graduation",
    batchV428,
    gate429,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV429Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
