#!/usr/bin/env node
/** Full-stack authoring batch v157 (G2869): v156 + Post-74 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV156Smoke } from "./hub-cwl-authoring-batch-v156-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost157GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V157_KIND = "chrysalis.hub.cwl-authoring-batch-v157";
export const HUB_CWL_AUTHORING_BATCH_V157_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV157Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV156 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV156Smoke(resolvePriorBatchOpts(opts, 156));
  const gate157 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost157GraduationGate({ repoRoot });
  const ok = batchV156.ok === true && gate157.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V157_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V157_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate157Mode: skipPrior ? "evidence-trend" : "post157-graduation",
    batchV156,
    gate157,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV157Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
