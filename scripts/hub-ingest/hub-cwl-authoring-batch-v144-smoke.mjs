#!/usr/bin/env node
/** Full-stack authoring batch v144 (G2739): v143 + Month-23 graduation + post-89 lock. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV143Smoke } from "./hub-cwl-authoring-batch-v143-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost144GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V144_KIND = "chrysalis.hub.cwl-authoring-batch-v144";
export const HUB_CWL_AUTHORING_BATCH_V144_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV144Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV143 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV143Smoke(resolvePriorBatchOpts(opts, 143));
  const gate144 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost144GraduationGate({ repoRoot });
  const ok = batchV143.ok === true && gate144.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V144_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V144_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate144Mode: skipPrior ? "evidence-trend" : "post144-graduation",
    batchV143,
    gate144,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV144Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
