#!/usr/bin/env node
/** Full-stack authoring batch v331 (G4609): v330 + Post-116 verify-gaps + chimera + translate replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV330Smoke } from "./hub-cwl-authoring-batch-v330-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost331GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V331_KIND = "chrysalis.hub.cwl-authoring-batch-v331";
export const HUB_CWL_AUTHORING_BATCH_V331_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV331Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV330 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV330Smoke(resolvePriorBatchOpts(opts, 330));
  const gate331 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost331GraduationGate({ repoRoot });
  const ok = batchV330.ok === true && gate331.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V331_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V331_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate331Mode: skipPrior ? "evidence-trend" : "post331-graduation",
    batchV330,
    gate331,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV331Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
