#!/usr/bin/env node
/** Full-stack authoring batch v264 (G3939): v263 + Post-120 HTTP verify + express oracle replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV263Smoke } from "./hub-cwl-authoring-batch-v263-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost264GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V264_KIND = "chrysalis.hub.cwl-authoring-batch-v264";
export const HUB_CWL_AUTHORING_BATCH_V264_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV264Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV263 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV263Smoke(resolvePriorBatchOpts(opts, 263));
  const gate264 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost264GraduationGate({ repoRoot });
  const ok = batchV263.ok === true && gate264.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V264_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V264_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate264Mode: skipPrior ? "evidence-trend" : "post264-graduation",
    batchV263,
    gate264,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV264Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
