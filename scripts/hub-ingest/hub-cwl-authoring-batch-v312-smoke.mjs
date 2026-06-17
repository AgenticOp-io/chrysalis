#!/usr/bin/env node
/** Full-stack authoring batch v312 (G4419): v311 + Post-85 post-translate express replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV311Smoke } from "./hub-cwl-authoring-batch-v311-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost312GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V312_KIND = "chrysalis.hub.cwl-authoring-batch-v312";
export const HUB_CWL_AUTHORING_BATCH_V312_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV312Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV311 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV311Smoke(resolvePriorBatchOpts(opts, 311));
  const gate312 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost312GraduationGate({ repoRoot });
  const ok = batchV311.ok === true && gate312.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V312_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V312_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate312Mode: skipPrior ? "evidence-trend" : "post312-graduation",
    batchV311,
    gate312,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV312Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
