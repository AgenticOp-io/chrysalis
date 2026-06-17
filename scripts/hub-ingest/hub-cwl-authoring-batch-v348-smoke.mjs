#!/usr/bin/env node
/** Full-stack authoring batch v348 (G4779): v347 + Post-133 post-60 authoring replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV347Smoke } from "./hub-cwl-authoring-batch-v347-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost348GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V348_KIND = "chrysalis.hub.cwl-authoring-batch-v348";
export const HUB_CWL_AUTHORING_BATCH_V348_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV348Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV347 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV347Smoke(resolvePriorBatchOpts(opts, 347));
  const gate348 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost348GraduationGate({ repoRoot });
  const ok = batchV347.ok === true && gate348.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V348_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V348_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate348Mode: skipPrior ? "evidence-trend" : "post348-graduation",
    batchV347,
    gate348,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV348Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
