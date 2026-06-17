#!/usr/bin/env node
/** Full-stack authoring batch v193 (G3229): v192 + Post-121 CWL preview + OpenAPI replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV192Smoke } from "./hub-cwl-authoring-batch-v192-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost193GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V193_KIND = "chrysalis.hub.cwl-authoring-batch-v193";
export const HUB_CWL_AUTHORING_BATCH_V193_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV193Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV192 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV192Smoke(resolvePriorBatchOpts(opts, 192));
  const gate193 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost193GraduationGate({ repoRoot });
  const ok = batchV192.ok === true && gate193.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V193_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V193_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate193Mode: skipPrior ? "evidence-trend" : "post193-graduation",
    batchV192,
    gate193,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV193Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
