#!/usr/bin/env node
/** Full-stack authoring batch v179 (G3089): v178 + Post-106 verify standalone mega replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV178Smoke } from "./hub-cwl-authoring-batch-v178-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost179GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V179_KIND = "chrysalis.hub.cwl-authoring-batch-v179";
export const HUB_CWL_AUTHORING_BATCH_V179_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV179Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV178 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV178Smoke(resolvePriorBatchOpts(opts, 178));
  const gate179 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost179GraduationGate({ repoRoot });
  const ok = batchV178.ok === true && gate179.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V179_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V179_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate179Mode: skipPrior ? "evidence-trend" : "post179-graduation",
    batchV178,
    gate179,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV179Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
