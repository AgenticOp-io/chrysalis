#!/usr/bin/env node
/** Full-stack authoring batch v314 (G4439): v313 + Post-87 month-2 pilot replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV313Smoke } from "./hub-cwl-authoring-batch-v313-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost314GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V314_KIND = "chrysalis.hub.cwl-authoring-batch-v314";
export const HUB_CWL_AUTHORING_BATCH_V314_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV314Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV313 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV313Smoke(resolvePriorBatchOpts(opts, 313));
  const gate314 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost314GraduationGate({ repoRoot });
  const ok = batchV313.ok === true && gate314.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V314_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V314_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate314Mode: skipPrior ? "evidence-trend" : "post314-graduation",
    batchV313,
    gate314,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV314Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
