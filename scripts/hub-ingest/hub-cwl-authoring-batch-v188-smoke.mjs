#!/usr/bin/env node
/** Full-stack authoring batch v188 (G3179): v187 + Post-116 verify-gaps + chimera + translate replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV187Smoke } from "./hub-cwl-authoring-batch-v187-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost188GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V188_KIND = "chrysalis.hub.cwl-authoring-batch-v188";
export const HUB_CWL_AUTHORING_BATCH_V188_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV188Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV187 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV187Smoke(resolvePriorBatchOpts(opts, 187));
  const gate188 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost188GraduationGate({ repoRoot });
  const ok = batchV187.ok === true && gate188.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V188_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V188_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate188Mode: skipPrior ? "evidence-trend" : "post188-graduation",
    batchV187,
    gate188,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV188Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
