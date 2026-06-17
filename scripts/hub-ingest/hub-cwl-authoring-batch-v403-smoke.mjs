#!/usr/bin/env node
/** Full-stack authoring batch v403 (G5329): v402 + Post-117 contract + CWL roundtrip replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV402Smoke } from "./hub-cwl-authoring-batch-v402-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost403GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V403_KIND = "chrysalis.hub.cwl-authoring-batch-v403";
export const HUB_CWL_AUTHORING_BATCH_V403_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV403Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV402 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV402Smoke(resolvePriorBatchOpts(opts, 402));
  const gate403 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost403GraduationGate({ repoRoot });
  const ok = batchV402.ok === true && gate403.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V403_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V403_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate403Mode: skipPrior ? "evidence-trend" : "post403-graduation",
    batchV402,
    gate403,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV403Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
