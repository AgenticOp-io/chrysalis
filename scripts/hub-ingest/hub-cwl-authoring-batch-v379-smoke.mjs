#!/usr/bin/env node
/** Full-stack authoring batch v379 (G5089): v378 + Post-81 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV378Smoke } from "./hub-cwl-authoring-batch-v378-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost379GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V379_KIND = "chrysalis.hub.cwl-authoring-batch-v379";
export const HUB_CWL_AUTHORING_BATCH_V379_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV379Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV378 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV378Smoke(resolvePriorBatchOpts(opts, 378));
  const gate379 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost379GraduationGate({ repoRoot });
  const ok = batchV378.ok === true && gate379.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V379_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V379_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate379Mode: skipPrior ? "evidence-trend" : "post379-graduation",
    batchV378,
    gate379,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV379Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
