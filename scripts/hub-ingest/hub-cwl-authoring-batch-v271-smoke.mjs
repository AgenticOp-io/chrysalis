#!/usr/bin/env node
/** Full-stack authoring batch v271 (G4009): v270 + Post-127 verify-gaps ingest closure replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV270Smoke } from "./hub-cwl-authoring-batch-v270-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost271GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V271_KIND = "chrysalis.hub.cwl-authoring-batch-v271";
export const HUB_CWL_AUTHORING_BATCH_V271_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV271Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV270 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV270Smoke(resolvePriorBatchOpts(opts, 270));
  const gate271 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost271GraduationGate({ repoRoot });
  const ok = batchV270.ok === true && gate271.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V271_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V271_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate271Mode: skipPrior ? "evidence-trend" : "post271-graduation",
    batchV270,
    gate271,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV271Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
