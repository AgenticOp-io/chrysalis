#!/usr/bin/env node
/** Full-stack authoring batch v434 (G5639): v433 + Post-65 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV433Smoke } from "./hub-cwl-authoring-batch-v433-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost434GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V434_KIND = "chrysalis.hub.cwl-authoring-batch-v434";
export const HUB_CWL_AUTHORING_BATCH_V434_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV434Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV433 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV433Smoke(resolvePriorBatchOpts(opts, 433));
  const gate434 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost434GraduationGate({ repoRoot });
  const ok = batchV433.ok === true && gate434.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V434_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V434_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate434Mode: skipPrior ? "evidence-trend" : "post434-graduation",
    batchV433,
    gate434,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV434Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
