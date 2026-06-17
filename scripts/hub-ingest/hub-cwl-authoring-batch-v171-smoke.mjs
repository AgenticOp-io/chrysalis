#!/usr/bin/env node
/** Full-stack authoring batch v171 (G3009): v170 + Post-88 month-2 mega replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV170Smoke } from "./hub-cwl-authoring-batch-v170-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost171GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V171_KIND = "chrysalis.hub.cwl-authoring-batch-v171";
export const HUB_CWL_AUTHORING_BATCH_V171_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV171Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV170 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV170Smoke(resolvePriorBatchOpts(opts, 170));
  const gate171 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost171GraduationGate({ repoRoot });
  const ok = batchV170.ok === true && gate171.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V171_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V171_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate171Mode: skipPrior ? "evidence-trend" : "post171-graduation",
    batchV170,
    gate171,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV171Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
