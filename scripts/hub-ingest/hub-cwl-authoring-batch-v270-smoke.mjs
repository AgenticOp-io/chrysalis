#!/usr/bin/env node
/** Full-stack authoring batch v270 (G3999): v269 + Post-126 tri-origin verify-gaps replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV269Smoke } from "./hub-cwl-authoring-batch-v269-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost270GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V270_KIND = "chrysalis.hub.cwl-authoring-batch-v270";
export const HUB_CWL_AUTHORING_BATCH_V270_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV270Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV269 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV269Smoke(resolvePriorBatchOpts(opts, 269));
  const gate270 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost270GraduationGate({ repoRoot });
  const ok = batchV269.ok === true && gate270.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V270_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V270_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate270Mode: skipPrior ? "evidence-trend" : "post270-graduation",
    batchV269,
    gate270,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV270Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
