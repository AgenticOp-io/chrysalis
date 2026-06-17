#!/usr/bin/env node
/** Full-stack authoring batch v189 (G3189): v188 + Post-117 contract + CWL roundtrip replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV188Smoke } from "./hub-cwl-authoring-batch-v188-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost189GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V189_KIND = "chrysalis.hub.cwl-authoring-batch-v189";
export const HUB_CWL_AUTHORING_BATCH_V189_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV189Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV188 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV188Smoke(resolvePriorBatchOpts(opts, 188));
  const gate189 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost189GraduationGate({ repoRoot });
  const ok = batchV188.ok === true && gate189.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V189_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V189_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate189Mode: skipPrior ? "evidence-trend" : "post189-graduation",
    batchV188,
    gate189,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV189Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
