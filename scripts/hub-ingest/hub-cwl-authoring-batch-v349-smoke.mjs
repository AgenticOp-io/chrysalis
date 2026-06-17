#!/usr/bin/env node
/** Full-stack authoring batch v349 (G4789): v348 + Post-134 fullstack HTTP + gaps depth replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV348Smoke } from "./hub-cwl-authoring-batch-v348-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost349GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V349_KIND = "chrysalis.hub.cwl-authoring-batch-v349";
export const HUB_CWL_AUTHORING_BATCH_V349_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV349Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV348 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV348Smoke(resolvePriorBatchOpts(opts, 348));
  const gate349 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost349GraduationGate({ repoRoot });
  const ok = batchV348.ok === true && gate349.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V349_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V349_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate349Mode: skipPrior ? "evidence-trend" : "post349-graduation",
    batchV348,
    gate349,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV349Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
