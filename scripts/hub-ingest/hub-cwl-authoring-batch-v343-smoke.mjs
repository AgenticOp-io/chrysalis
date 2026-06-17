#!/usr/bin/env node
/** Full-stack authoring batch v343 (G4729): v342 + Post-128 auth-probe reingest HTTP replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV342Smoke } from "./hub-cwl-authoring-batch-v342-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost343GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V343_KIND = "chrysalis.hub.cwl-authoring-batch-v343";
export const HUB_CWL_AUTHORING_BATCH_V343_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV343Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV342 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV342Smoke(resolvePriorBatchOpts(opts, 342));
  const gate343 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost343GraduationGate({ repoRoot });
  const ok = batchV342.ok === true && gate343.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V343_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V343_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate343Mode: skipPrior ? "evidence-trend" : "post343-graduation",
    batchV342,
    gate343,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV343Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
