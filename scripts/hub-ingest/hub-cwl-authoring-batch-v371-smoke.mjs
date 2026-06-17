#!/usr/bin/env node
/** Full-stack authoring batch v371 (G5009): v370 + Post-73 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV370Smoke } from "./hub-cwl-authoring-batch-v370-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost371GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V371_KIND = "chrysalis.hub.cwl-authoring-batch-v371";
export const HUB_CWL_AUTHORING_BATCH_V371_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV371Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV370 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV370Smoke(resolvePriorBatchOpts(opts, 370));
  const gate371 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost371GraduationGate({ repoRoot });
  const ok = batchV370.ok === true && gate371.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V371_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V371_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate371Mode: skipPrior ? "evidence-trend" : "post371-graduation",
    batchV370,
    gate371,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV371Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
