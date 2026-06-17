#!/usr/bin/env node
/** Full-stack authoring batch v402 (G5319): v401 + Post-116 verify-gaps + chimera + translate replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV401Smoke } from "./hub-cwl-authoring-batch-v401-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost402GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V402_KIND = "chrysalis.hub.cwl-authoring-batch-v402";
export const HUB_CWL_AUTHORING_BATCH_V402_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV402Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV401 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV401Smoke(resolvePriorBatchOpts(opts, 401));
  const gate402 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost402GraduationGate({ repoRoot });
  const ok = batchV401.ok === true && gate402.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V402_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V402_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate402Mode: skipPrior ? "evidence-trend" : "post402-graduation",
    batchV401,
    gate402,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV402Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
