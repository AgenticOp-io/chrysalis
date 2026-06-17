#!/usr/bin/env node
/** Full-stack authoring batch v393 (G5229): v392 + Post-105 oracle product ultra replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV392Smoke } from "./hub-cwl-authoring-batch-v392-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost393GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V393_KIND = "chrysalis.hub.cwl-authoring-batch-v393";
export const HUB_CWL_AUTHORING_BATCH_V393_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV393Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV392 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV392Smoke(resolvePriorBatchOpts(opts, 392));
  const gate393 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost393GraduationGate({ repoRoot });
  const ok = batchV392.ok === true && gate393.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V393_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V393_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate393Mode: skipPrior ? "evidence-trend" : "post393-graduation",
    batchV392,
    gate393,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV393Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
