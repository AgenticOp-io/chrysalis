#!/usr/bin/env node
/** Full-stack authoring batch v135 (G2649): v134 + Post-40 flagship + chimera + delivery. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV134Smoke } from "./hub-cwl-authoring-batch-v134-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost135GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V135_KIND = "chrysalis.hub.cwl-authoring-batch-v135";
export const HUB_CWL_AUTHORING_BATCH_V135_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV135Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV134 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV134Smoke(resolvePriorBatchOpts(opts, 134));
  const gate135 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost135GraduationGate({ repoRoot });
  const ok = batchV134.ok === true && gate135.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V135_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V135_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate135Mode: skipPrior ? "evidence-trend" : "post135-graduation",
    batchV134,
    gate135,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV135Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
