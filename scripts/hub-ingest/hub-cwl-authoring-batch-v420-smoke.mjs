#!/usr/bin/env node
/** Full-stack authoring batch v420 (G5499): v419 + Post-134 fullstack HTTP + gaps depth replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV419Smoke } from "./hub-cwl-authoring-batch-v419-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost420GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V420_KIND = "chrysalis.hub.cwl-authoring-batch-v420";
export const HUB_CWL_AUTHORING_BATCH_V420_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV420Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV419 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV419Smoke(resolvePriorBatchOpts(opts, 419));
  const gate420 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost420GraduationGate({ repoRoot });
  const ok = batchV419.ok === true && gate420.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V420_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V420_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate420Mode: skipPrior ? "evidence-trend" : "post420-graduation",
    batchV419,
    gate420,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV420Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
