#!/usr/bin/env node
/** Full-stack authoring batch v412 (G5419): v411 + Post-126 tri-origin verify-gaps replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV411Smoke } from "./hub-cwl-authoring-batch-v411-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost412GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V412_KIND = "chrysalis.hub.cwl-authoring-batch-v412";
export const HUB_CWL_AUTHORING_BATCH_V412_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV412Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV411 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV411Smoke(resolvePriorBatchOpts(opts, 411));
  const gate412 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost412GraduationGate({ repoRoot });
  const ok = batchV411.ok === true && gate412.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V412_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V412_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate412Mode: skipPrior ? "evidence-trend" : "post412-graduation",
    batchV411,
    gate412,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV412Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
