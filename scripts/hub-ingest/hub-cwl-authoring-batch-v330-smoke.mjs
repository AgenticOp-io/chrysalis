#!/usr/bin/env node
/** Full-stack authoring batch v330 (G4599): v329 + Post-115 emit verify mega + session replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV329Smoke } from "./hub-cwl-authoring-batch-v329-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost330GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V330_KIND = "chrysalis.hub.cwl-authoring-batch-v330";
export const HUB_CWL_AUTHORING_BATCH_V330_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV330Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV329 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV329Smoke(resolvePriorBatchOpts(opts, 329));
  const gate330 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost330GraduationGate({ repoRoot });
  const ok = batchV329.ok === true && gate330.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V330_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V330_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate330Mode: skipPrior ? "evidence-trend" : "post330-graduation",
    batchV329,
    gate330,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV330Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
