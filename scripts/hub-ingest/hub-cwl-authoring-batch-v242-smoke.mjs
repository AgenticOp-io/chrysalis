#!/usr/bin/env node
/** Full-stack authoring batch v242 (G3719): v241 + Post-87 month-2 pilot replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV241Smoke } from "./hub-cwl-authoring-batch-v241-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost242GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V242_KIND = "chrysalis.hub.cwl-authoring-batch-v242";
export const HUB_CWL_AUTHORING_BATCH_V242_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV242Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV241 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV241Smoke(resolvePriorBatchOpts(opts, 241));
  const gate242 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost242GraduationGate({ repoRoot });
  const ok = batchV241.ok === true && gate242.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V242_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V242_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate242Mode: skipPrior ? "evidence-trend" : "post242-graduation",
    batchV241,
    gate242,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV242Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
