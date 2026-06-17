#!/usr/bin/env node
/** Full-stack authoring batch v273 (G4029): v272 + Post-129 IR helper lifting replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV272Smoke } from "./hub-cwl-authoring-batch-v272-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost273GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V273_KIND = "chrysalis.hub.cwl-authoring-batch-v273";
export const HUB_CWL_AUTHORING_BATCH_V273_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV273Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV272 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV272Smoke(resolvePriorBatchOpts(opts, 272));
  const gate273 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost273GraduationGate({ repoRoot });
  const ok = batchV272.ok === true && gate273.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V273_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V273_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate273Mode: skipPrior ? "evidence-trend" : "post273-graduation",
    batchV272,
    gate273,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV273Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
