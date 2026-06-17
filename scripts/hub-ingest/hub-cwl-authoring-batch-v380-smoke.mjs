#!/usr/bin/env node
/** Full-stack authoring batch v380 (G5099): v379 + Post-82 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV379Smoke } from "./hub-cwl-authoring-batch-v379-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost380GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V380_KIND = "chrysalis.hub.cwl-authoring-batch-v380";
export const HUB_CWL_AUTHORING_BATCH_V380_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV380Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV379 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV379Smoke(resolvePriorBatchOpts(opts, 379));
  const gate380 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost380GraduationGate({ repoRoot });
  const ok = batchV379.ok === true && gate380.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V380_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V380_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate380Mode: skipPrior ? "evidence-trend" : "post380-graduation",
    batchV379,
    gate380,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV380Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
