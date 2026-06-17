#!/usr/bin/env node
/** Full-stack authoring batch v319 (G4489): v318 + Post-102 emit probe replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV318Smoke } from "./hub-cwl-authoring-batch-v318-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost319GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V319_KIND = "chrysalis.hub.cwl-authoring-batch-v319";
export const HUB_CWL_AUTHORING_BATCH_V319_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV319Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV318 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV318Smoke(resolvePriorBatchOpts(opts, 318));
  const gate319 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost319GraduationGate({ repoRoot });
  const ok = batchV318.ok === true && gate319.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V319_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V319_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate319Mode: skipPrior ? "evidence-trend" : "post319-graduation",
    batchV318,
    gate319,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV319Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
