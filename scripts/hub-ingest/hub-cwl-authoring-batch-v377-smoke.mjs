#!/usr/bin/env node
/** Full-stack authoring batch v377 (G5069): v376 + Post-79 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV376Smoke } from "./hub-cwl-authoring-batch-v376-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost377GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V377_KIND = "chrysalis.hub.cwl-authoring-batch-v377";
export const HUB_CWL_AUTHORING_BATCH_V377_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV377Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV376 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV376Smoke(resolvePriorBatchOpts(opts, 376));
  const gate377 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost377GraduationGate({ repoRoot });
  const ok = batchV376.ok === true && gate377.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V377_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V377_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate377Mode: skipPrior ? "evidence-trend" : "post377-graduation",
    batchV376,
    gate377,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV377Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
