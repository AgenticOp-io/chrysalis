#!/usr/bin/env node
/** Full-stack authoring batch v254 (G3839): v253 + Post-109 hub graduation lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV253Smoke } from "./hub-cwl-authoring-batch-v253-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost254GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V254_KIND = "chrysalis.hub.cwl-authoring-batch-v254";
export const HUB_CWL_AUTHORING_BATCH_V254_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV254Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV253 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV253Smoke(resolvePriorBatchOpts(opts, 253));
  const gate254 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost254GraduationGate({ repoRoot });
  const ok = batchV253.ok === true && gate254.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V254_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V254_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate254Mode: skipPrior ? "evidence-trend" : "post254-graduation",
    batchV253,
    gate254,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV254Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
