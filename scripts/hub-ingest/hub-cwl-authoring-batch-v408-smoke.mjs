#!/usr/bin/env node
/** Full-stack authoring batch v408 (G5379): v407 + Post-122 diagnose + scope + formatter replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV407Smoke } from "./hub-cwl-authoring-batch-v407-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost408GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V408_KIND = "chrysalis.hub.cwl-authoring-batch-v408";
export const HUB_CWL_AUTHORING_BATCH_V408_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV408Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV407 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV407Smoke(resolvePriorBatchOpts(opts, 407));
  const gate408 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost408GraduationGate({ repoRoot });
  const ok = batchV407.ok === true && gate408.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V408_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V408_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate408Mode: skipPrior ? "evidence-trend" : "post408-graduation",
    batchV407,
    gate408,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV408Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
