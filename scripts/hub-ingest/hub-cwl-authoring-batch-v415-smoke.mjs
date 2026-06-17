#!/usr/bin/env node
/** Full-stack authoring batch v415 (G5449): v414 + Post-129 IR helper lifting replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV414Smoke } from "./hub-cwl-authoring-batch-v414-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost415GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V415_KIND = "chrysalis.hub.cwl-authoring-batch-v415";
export const HUB_CWL_AUTHORING_BATCH_V415_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV415Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV414 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV414Smoke(resolvePriorBatchOpts(opts, 414));
  const gate415 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost415GraduationGate({ repoRoot });
  const ok = batchV414.ok === true && gate415.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V415_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V415_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate415Mode: skipPrior ? "evidence-trend" : "post415-graduation",
    batchV414,
    gate415,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV415Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
