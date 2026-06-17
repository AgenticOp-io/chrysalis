#!/usr/bin/env node
/** Full-stack authoring batch v318 (G4479): v317 + Post-101 runtime production replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV317Smoke } from "./hub-cwl-authoring-batch-v317-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost318GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V318_KIND = "chrysalis.hub.cwl-authoring-batch-v318";
export const HUB_CWL_AUTHORING_BATCH_V318_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV318Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV317 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV317Smoke(resolvePriorBatchOpts(opts, 317));
  const gate318 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost318GraduationGate({ repoRoot });
  const ok = batchV317.ok === true && gate318.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V318_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V318_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate318Mode: skipPrior ? "evidence-trend" : "post318-graduation",
    batchV317,
    gate318,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV318Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
