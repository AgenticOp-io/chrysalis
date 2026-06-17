#!/usr/bin/env node
/** Full-stack authoring batch v360 (G4899): v359 + Phase D graduation lock (hub ops mega) replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV359Smoke } from "./hub-cwl-authoring-batch-v359-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost360GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V360_KIND = "chrysalis.hub.cwl-authoring-batch-v360";
export const HUB_CWL_AUTHORING_BATCH_V360_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV360Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV359 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV359Smoke(resolvePriorBatchOpts(opts, 359));
  const gate360 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost360GraduationGate({ repoRoot });
  const ok = batchV359.ok === true && gate360.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V360_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V360_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate360Mode: skipPrior ? "evidence-trend" : "post360-graduation",
    batchV359,
    gate360,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV360Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
