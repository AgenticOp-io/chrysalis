#!/usr/bin/env node
/** Full-stack authoring batch v315 (G4449): v314 + Post-88 month-2 mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV314Smoke } from "./hub-cwl-authoring-batch-v314-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost315GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V315_KIND = "chrysalis.hub.cwl-authoring-batch-v315";
export const HUB_CWL_AUTHORING_BATCH_V315_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV315Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV314 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV314Smoke(resolvePriorBatchOpts(opts, 314));
  const gate315 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost315GraduationGate({ repoRoot });
  const ok = batchV314.ok === true && gate315.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V315_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V315_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate315Mode: skipPrior ? "evidence-trend" : "post315-graduation",
    batchV314,
    gate315,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV315Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
