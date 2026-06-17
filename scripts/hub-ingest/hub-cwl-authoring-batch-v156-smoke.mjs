#!/usr/bin/env node
/** Full-stack authoring batch v156 (G2859): v155 + Post-73 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV155Smoke } from "./hub-cwl-authoring-batch-v155-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost156GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V156_KIND = "chrysalis.hub.cwl-authoring-batch-v156";
export const HUB_CWL_AUTHORING_BATCH_V156_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV156Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV155 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV155Smoke(resolvePriorBatchOpts(opts, 155));
  const gate156 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost156GraduationGate({ repoRoot });
  const ok = batchV155.ok === true && gate156.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V156_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V156_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate156Mode: skipPrior ? "evidence-trend" : "post156-graduation",
    batchV155,
    gate156,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV156Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
