#!/usr/bin/env node
/** Full-stack authoring batch v310 (G4399): v309 + Post-83 translate E2E replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV309Smoke } from "./hub-cwl-authoring-batch-v309-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost310GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V310_KIND = "chrysalis.hub.cwl-authoring-batch-v310";
export const HUB_CWL_AUTHORING_BATCH_V310_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV310Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV309 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV309Smoke(resolvePriorBatchOpts(opts, 309));
  const gate310 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost310GraduationGate({ repoRoot });
  const ok = batchV309.ok === true && gate310.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V310_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V310_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate310Mode: skipPrior ? "evidence-trend" : "post310-graduation",
    batchV309,
    gate310,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV310Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
