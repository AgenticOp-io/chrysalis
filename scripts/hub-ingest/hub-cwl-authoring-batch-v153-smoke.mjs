#!/usr/bin/env node
/** Full-stack authoring batch v153 (G2829): v152 + Post-70 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV152Smoke } from "./hub-cwl-authoring-batch-v152-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost153GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V153_KIND = "chrysalis.hub.cwl-authoring-batch-v153";
export const HUB_CWL_AUTHORING_BATCH_V153_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV153Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV152 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV152Smoke(resolvePriorBatchOpts(opts, 152));
  const gate153 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost153GraduationGate({ repoRoot });
  const ok = batchV152.ok === true && gate153.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V153_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V153_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate153Mode: skipPrior ? "evidence-trend" : "post153-graduation",
    batchV152,
    gate153,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV153Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
