#!/usr/bin/env node
/** Full-stack authoring batch v369 (G4989): v368 + Post-71 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV368Smoke } from "./hub-cwl-authoring-batch-v368-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost369GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V369_KIND = "chrysalis.hub.cwl-authoring-batch-v369";
export const HUB_CWL_AUTHORING_BATCH_V369_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV369Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV368 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV368Smoke(resolvePriorBatchOpts(opts, 368));
  const gate369 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost369GraduationGate({ repoRoot });
  const ok = batchV368.ok === true && gate369.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V369_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V369_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate369Mode: skipPrior ? "evidence-trend" : "post369-graduation",
    batchV368,
    gate369,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV369Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
