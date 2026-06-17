#!/usr/bin/env node
/** Full-stack authoring batch v286 (G4159): v285 + Post-76/77 dual-origin search export replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV285Smoke } from "./hub-cwl-authoring-batch-v285-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost286GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V286_KIND = "chrysalis.hub.cwl-authoring-batch-v286";
export const HUB_CWL_AUTHORING_BATCH_V286_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV286Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV285 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV285Smoke(resolvePriorBatchOpts(opts, 285));
  const gate286 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost286GraduationGate({ repoRoot });
  const ok = batchV285.ok === true && gate286.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V286_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V286_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate286Mode: skipPrior ? "evidence-trend" : "post286-graduation",
    batchV285,
    gate286,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV286Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
