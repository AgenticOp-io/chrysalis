#!/usr/bin/env node
/** Full-stack authoring batch v198 (G3279): v197 + Post-126 tri-origin verify-gaps replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV197Smoke } from "./hub-cwl-authoring-batch-v197-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost198GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V198_KIND = "chrysalis.hub.cwl-authoring-batch-v198";
export const HUB_CWL_AUTHORING_BATCH_V198_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV198Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV197 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV197Smoke(resolvePriorBatchOpts(opts, 197));
  const gate198 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost198GraduationGate({ repoRoot });
  const ok = batchV197.ok === true && gate198.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V198_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V198_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate198Mode: skipPrior ? "evidence-trend" : "post198-graduation",
    batchV197,
    gate198,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV198Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
