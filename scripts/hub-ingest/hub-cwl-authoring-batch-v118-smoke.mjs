#!/usr/bin/env node
/** Full-stack authoring batch v118 (G2479): v117 + Verify-gaps action + post-translate express. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV117Smoke } from "./hub-cwl-authoring-batch-v117-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost118GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V118_KIND = "chrysalis.hub.cwl-authoring-batch-v118";
export const HUB_CWL_AUTHORING_BATCH_V118_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV118Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV117 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV117Smoke(resolvePriorBatchOpts(opts, 117));
  const gate118 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost118GraduationGate({ repoRoot });
  const ok = batchV117.ok === true && gate118.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V118_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V118_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate118Mode: skipPrior ? "evidence-trend" : "post118-graduation",
    batchV117,
    gate118,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV118Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
