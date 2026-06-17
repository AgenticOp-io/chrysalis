#!/usr/bin/env node
/** Full-stack authoring batch v333 (G4629): v332 + Post-118 verify-gaps action replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV332Smoke } from "./hub-cwl-authoring-batch-v332-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost333GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V333_KIND = "chrysalis.hub.cwl-authoring-batch-v333";
export const HUB_CWL_AUTHORING_BATCH_V333_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV333Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV332 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV332Smoke(resolvePriorBatchOpts(opts, 332));
  const gate333 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost333GraduationGate({ repoRoot });
  const ok = batchV332.ok === true && gate333.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V333_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V333_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate333Mode: skipPrior ? "evidence-trend" : "post333-graduation",
    batchV332,
    gate333,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV333Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
