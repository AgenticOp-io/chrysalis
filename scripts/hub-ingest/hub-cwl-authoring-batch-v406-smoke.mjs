#!/usr/bin/env node
/** Full-stack authoring batch v406 (G5359): v405 + Post-120 HTTP verify + express oracle replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV405Smoke } from "./hub-cwl-authoring-batch-v405-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost406GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V406_KIND = "chrysalis.hub.cwl-authoring-batch-v406";
export const HUB_CWL_AUTHORING_BATCH_V406_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV406Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV405 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV405Smoke(resolvePriorBatchOpts(opts, 405));
  const gate406 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost406GraduationGate({ repoRoot });
  const ok = batchV405.ok === true && gate406.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V406_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V406_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate406Mode: skipPrior ? "evidence-trend" : "post406-graduation",
    batchV405,
    gate406,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV406Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
