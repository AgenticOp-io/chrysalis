#!/usr/bin/env node
/** Full-stack authoring batch v141 (G2709): v140 + Post-73/74/75 flagship HTTP express. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV140Smoke } from "./hub-cwl-authoring-batch-v140-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost141GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V141_KIND = "chrysalis.hub.cwl-authoring-batch-v141";
export const HUB_CWL_AUTHORING_BATCH_V141_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV141Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV140 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV140Smoke(resolvePriorBatchOpts(opts, 140));
  const gate141 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost141GraduationGate({ repoRoot });
  const ok = batchV140.ok === true && gate141.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V141_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V141_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate141Mode: skipPrior ? "evidence-trend" : "post141-graduation",
    batchV140,
    gate141,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV141Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
