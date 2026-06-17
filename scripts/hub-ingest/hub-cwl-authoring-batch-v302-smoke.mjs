#!/usr/bin/env node
/** Full-stack authoring batch v302 (G4319): v301 + Post-75 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV301Smoke } from "./hub-cwl-authoring-batch-v301-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost302GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V302_KIND = "chrysalis.hub.cwl-authoring-batch-v302";
export const HUB_CWL_AUTHORING_BATCH_V302_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV302Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV301 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV301Smoke(resolvePriorBatchOpts(opts, 301));
  const gate302 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost302GraduationGate({ repoRoot });
  const ok = batchV301.ok === true && gate302.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V302_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V302_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate302Mode: skipPrior ? "evidence-trend" : "post302-graduation",
    batchV301,
    gate302,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV302Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
