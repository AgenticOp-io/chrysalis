#!/usr/bin/env node
/** Full-stack authoring batch v263 (G3929): v262 + Post-119 gold runtime + parity replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV262Smoke } from "./hub-cwl-authoring-batch-v262-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost263GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V263_KIND = "chrysalis.hub.cwl-authoring-batch-v263";
export const HUB_CWL_AUTHORING_BATCH_V263_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV263Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV262 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV262Smoke(resolvePriorBatchOpts(opts, 262));
  const gate263 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost263GraduationGate({ repoRoot });
  const ok = batchV262.ok === true && gate263.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V263_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V263_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate263Mode: skipPrior ? "evidence-trend" : "post263-graduation",
    batchV262,
    gate263,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV263Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
