#!/usr/bin/env node
/** Full-stack authoring batch v427 (G5569): v426 + Post-141 flagship HTTP express replay (Phase M lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV426Smoke } from "./hub-cwl-authoring-batch-v426-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost427GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V427_KIND = "chrysalis.hub.cwl-authoring-batch-v427";
export const HUB_CWL_AUTHORING_BATCH_V427_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV427Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV426 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV426Smoke(resolvePriorBatchOpts(opts, 426));
  const gate427 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost427GraduationGate({ repoRoot });
  const ok = batchV426.ok === true && gate427.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V427_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V427_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate427Mode: skipPrior ? "evidence-trend" : "post427-graduation",
    batchV426,
    gate427,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV427Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
