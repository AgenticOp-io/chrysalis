#!/usr/bin/env node
/** Full-stack authoring batch v304 (G4339): v303 + Post-77 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV303Smoke } from "./hub-cwl-authoring-batch-v303-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost304GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V304_KIND = "chrysalis.hub.cwl-authoring-batch-v304";
export const HUB_CWL_AUTHORING_BATCH_V304_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV304Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV303 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV303Smoke(resolvePriorBatchOpts(opts, 303));
  const gate304 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost304GraduationGate({ repoRoot });
  const ok = batchV303.ok === true && gate304.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V304_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V304_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate304Mode: skipPrior ? "evidence-trend" : "post304-graduation",
    batchV303,
    gate304,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV304Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
