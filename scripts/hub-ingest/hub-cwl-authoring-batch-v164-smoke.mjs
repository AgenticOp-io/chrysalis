#!/usr/bin/env node
/** Full-stack authoring batch v164 (G2939): v163 + Post-81 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV163Smoke } from "./hub-cwl-authoring-batch-v163-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost164GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V164_KIND = "chrysalis.hub.cwl-authoring-batch-v164";
export const HUB_CWL_AUTHORING_BATCH_V164_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV164Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV163 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV163Smoke(resolvePriorBatchOpts(opts, 163));
  const gate164 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost164GraduationGate({ repoRoot });
  const ok = batchV163.ok === true && gate164.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V164_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V164_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate164Mode: skipPrior ? "evidence-trend" : "post164-graduation",
    batchV163,
    gate164,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV164Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
