#!/usr/bin/env node
/** Full-stack authoring batch v246 (G3759): v245 + Post-101 runtime production replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV245Smoke } from "./hub-cwl-authoring-batch-v245-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost246GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V246_KIND = "chrysalis.hub.cwl-authoring-batch-v246";
export const HUB_CWL_AUTHORING_BATCH_V246_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV246Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV245 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV245Smoke(resolvePriorBatchOpts(opts, 245));
  const gate246 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost246GraduationGate({ repoRoot });
  const ok = batchV245.ok === true && gate246.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V246_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V246_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate246Mode: skipPrior ? "evidence-trend" : "post246-graduation",
    batchV245,
    gate246,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV246Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
