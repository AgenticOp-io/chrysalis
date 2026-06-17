#!/usr/bin/env node
/** Full-stack authoring batch v243 (G3729): v242 + Post-88 month-2 mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV242Smoke } from "./hub-cwl-authoring-batch-v242-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost243GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V243_KIND = "chrysalis.hub.cwl-authoring-batch-v243";
export const HUB_CWL_AUTHORING_BATCH_V243_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV243Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV242 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV242Smoke(resolvePriorBatchOpts(opts, 242));
  const gate243 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost243GraduationGate({ repoRoot });
  const ok = batchV242.ok === true && gate243.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V243_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V243_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate243Mode: skipPrior ? "evidence-trend" : "post243-graduation",
    batchV242,
    gate243,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV243Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
