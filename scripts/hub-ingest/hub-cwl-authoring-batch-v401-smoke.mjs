#!/usr/bin/env node
/** Full-stack authoring batch v401 (G5309): v400 + Post-115 emit verify mega + session replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV400Smoke } from "./hub-cwl-authoring-batch-v400-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost401GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V401_KIND = "chrysalis.hub.cwl-authoring-batch-v401";
export const HUB_CWL_AUTHORING_BATCH_V401_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV401Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV400 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV400Smoke(resolvePriorBatchOpts(opts, 400));
  const gate401 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost401GraduationGate({ repoRoot });
  const ok = batchV400.ok === true && gate401.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V401_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V401_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate401Mode: skipPrior ? "evidence-trend" : "post401-graduation",
    batchV400,
    gate401,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV401Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
