#!/usr/bin/env node
/** Full-stack authoring batch v251 (G3809): v250 + Post-106 verify standalone mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV250Smoke } from "./hub-cwl-authoring-batch-v250-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost251GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V251_KIND = "chrysalis.hub.cwl-authoring-batch-v251";
export const HUB_CWL_AUTHORING_BATCH_V251_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV251Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV250 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV250Smoke(resolvePriorBatchOpts(opts, 250));
  const gate251 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost251GraduationGate({ repoRoot });
  const ok = batchV250.ok === true && gate251.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V251_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V251_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate251Mode: skipPrior ? "evidence-trend" : "post251-graduation",
    batchV250,
    gate251,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV251Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
