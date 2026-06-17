#!/usr/bin/env node
/** Full-stack authoring batch v321 (G4509): v320 + Post-104 migration OS mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV320Smoke } from "./hub-cwl-authoring-batch-v320-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost321GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V321_KIND = "chrysalis.hub.cwl-authoring-batch-v321";
export const HUB_CWL_AUTHORING_BATCH_V321_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV321Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV320 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV320Smoke(resolvePriorBatchOpts(opts, 320));
  const gate321 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost321GraduationGate({ repoRoot });
  const ok = batchV320.ok === true && gate321.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V321_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V321_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate321Mode: skipPrior ? "evidence-trend" : "post321-graduation",
    batchV320,
    gate321,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV321Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
