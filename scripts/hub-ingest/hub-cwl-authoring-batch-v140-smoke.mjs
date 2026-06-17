#!/usr/bin/env node
/** Full-stack authoring batch v140 (G2699): v139 + Post-70/80 month-2 mega composite. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV139Smoke } from "./hub-cwl-authoring-batch-v139-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost140GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V140_KIND = "chrysalis.hub.cwl-authoring-batch-v140";
export const HUB_CWL_AUTHORING_BATCH_V140_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV140Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV139 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV139Smoke(resolvePriorBatchOpts(opts, 139));
  const gate140 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost140GraduationGate({ repoRoot });
  const ok = batchV139.ok === true && gate140.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V140_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V140_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate140Mode: skipPrior ? "evidence-trend" : "post140-graduation",
    batchV139,
    gate140,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV140Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
