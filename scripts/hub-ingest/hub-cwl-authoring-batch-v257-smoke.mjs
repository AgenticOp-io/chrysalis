#!/usr/bin/env node
/** Full-stack authoring batch v257 (G3869): v256 + Post-113 production search replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV256Smoke } from "./hub-cwl-authoring-batch-v256-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost257GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V257_KIND = "chrysalis.hub.cwl-authoring-batch-v257";
export const HUB_CWL_AUTHORING_BATCH_V257_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV257Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV256 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV256Smoke(resolvePriorBatchOpts(opts, 256));
  const gate257 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost257GraduationGate({ repoRoot });
  const ok = batchV256.ok === true && gate257.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V257_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V257_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate257Mode: skipPrior ? "evidence-trend" : "post257-graduation",
    batchV256,
    gate257,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV257Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
