#!/usr/bin/env node
/** Full-stack authoring batch v190 (G3199): v189 + Post-118 verify-gaps action replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV189Smoke } from "./hub-cwl-authoring-batch-v189-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost190GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V190_KIND = "chrysalis.hub.cwl-authoring-batch-v190";
export const HUB_CWL_AUTHORING_BATCH_V190_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV190Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV189 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV189Smoke(resolvePriorBatchOpts(opts, 189));
  const gate190 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost190GraduationGate({ repoRoot });
  const ok = batchV189.ok === true && gate190.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V190_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V190_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate190Mode: skipPrior ? "evidence-trend" : "post190-graduation",
    batchV189,
    gate190,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV190Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
