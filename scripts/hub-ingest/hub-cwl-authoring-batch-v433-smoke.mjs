#!/usr/bin/env node
/** Full-stack authoring batch v433 (G5629): v432 + Post-64 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV432Smoke } from "./hub-cwl-authoring-batch-v432-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost433GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V433_KIND = "chrysalis.hub.cwl-authoring-batch-v433";
export const HUB_CWL_AUTHORING_BATCH_V433_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV433Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV432 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV432Smoke(resolvePriorBatchOpts(opts, 432));
  const gate433 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost433GraduationGate({ repoRoot });
  const ok = batchV432.ok === true && gate433.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V433_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V433_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate433Mode: skipPrior ? "evidence-trend" : "post433-graduation",
    batchV432,
    gate433,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV433Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
