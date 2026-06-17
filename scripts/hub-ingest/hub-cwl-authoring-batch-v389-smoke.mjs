#!/usr/bin/env node
/** Full-stack authoring batch v389 (G5189): v388 + Post-101 runtime production replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV388Smoke } from "./hub-cwl-authoring-batch-v388-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost389GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V389_KIND = "chrysalis.hub.cwl-authoring-batch-v389";
export const HUB_CWL_AUTHORING_BATCH_V389_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV389Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV388 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV388Smoke(resolvePriorBatchOpts(opts, 388));
  const gate389 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost389GraduationGate({ repoRoot });
  const ok = batchV388.ok === true && gate389.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V389_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V389_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate389Mode: skipPrior ? "evidence-trend" : "post389-graduation",
    batchV388,
    gate389,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV389Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
