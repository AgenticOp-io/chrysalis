#!/usr/bin/env node
/** Full-stack authoring batch v154 (G2839): v153 + Post-71 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV153Smoke } from "./hub-cwl-authoring-batch-v153-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost154GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V154_KIND = "chrysalis.hub.cwl-authoring-batch-v154";
export const HUB_CWL_AUTHORING_BATCH_V154_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV154Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV153 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV153Smoke(resolvePriorBatchOpts(opts, 153));
  const gate154 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost154GraduationGate({ repoRoot });
  const ok = batchV153.ok === true && gate154.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V154_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V154_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate154Mode: skipPrior ? "evidence-trend" : "post154-graduation",
    batchV153,
    gate154,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV154Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
