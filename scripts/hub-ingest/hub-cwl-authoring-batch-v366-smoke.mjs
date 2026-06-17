#!/usr/bin/env node
/** Full-stack authoring batch v366 (G4959): v365 + Post-68 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV365Smoke } from "./hub-cwl-authoring-batch-v365-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost366GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V366_KIND = "chrysalis.hub.cwl-authoring-batch-v366";
export const HUB_CWL_AUTHORING_BATCH_V366_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV366Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV365 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV365Smoke(resolvePriorBatchOpts(opts, 365));
  const gate366 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost366GraduationGate({ repoRoot });
  const ok = batchV365.ok === true && gate366.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V366_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V366_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate366Mode: skipPrior ? "evidence-trend" : "post366-graduation",
    batchV365,
    gate366,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV366Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
