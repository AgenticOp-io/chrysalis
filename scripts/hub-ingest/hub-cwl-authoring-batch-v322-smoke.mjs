#!/usr/bin/env node
/** Full-stack authoring batch v322 (G4519): v321 + Post-105 oracle product ultra replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV321Smoke } from "./hub-cwl-authoring-batch-v321-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost322GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V322_KIND = "chrysalis.hub.cwl-authoring-batch-v322";
export const HUB_CWL_AUTHORING_BATCH_V322_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV322Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV321 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV321Smoke(resolvePriorBatchOpts(opts, 321));
  const gate322 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost322GraduationGate({ repoRoot });
  const ok = batchV321.ok === true && gate322.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V322_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V322_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate322Mode: skipPrior ? "evidence-trend" : "post322-graduation",
    batchV321,
    gate322,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV322Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
