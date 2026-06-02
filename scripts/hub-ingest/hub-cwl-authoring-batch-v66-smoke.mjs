#!/usr/bin/env node
/** Full-stack authoring batch v66 (G1811): v65 + full-stack CWL scope RFC gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV65Smoke } from "./hub-cwl-authoring-batch-v65-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runFullstackCwlScopeRfcGate,
  runPost65GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V66_KIND = "chrysalis.hub.cwl-authoring-batch-v66";
export const HUB_CWL_AUTHORING_BATCH_V66_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV66Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV65 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV65Smoke(resolvePriorBatchOpts(opts, 65));
  const gate66 = skipPrior
    ? await runFullstackCwlScopeRfcGate()
    : await runPost65GraduationGate({ repoRoot });
  const ok = batchV65.ok === true && gate66.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V66_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V66_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate66Mode: skipPrior ? "fullstack-scope-rfc" : "post65-graduation",
    batchV65,
    gate66,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV66Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
