#!/usr/bin/env node
/** Full-stack authoring batch v207 (G3369): v206 + Post-40 flagship + chimera + delivery replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV206Smoke } from "./hub-cwl-authoring-batch-v206-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost207GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V207_KIND = "chrysalis.hub.cwl-authoring-batch-v207";
export const HUB_CWL_AUTHORING_BATCH_V207_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV207Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV206 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV206Smoke(resolvePriorBatchOpts(opts, 206));
  const gate207 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost207GraduationGate({ repoRoot });
  const ok = batchV206.ok === true && gate207.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V207_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V207_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate207Mode: skipPrior ? "evidence-trend" : "post207-graduation",
    batchV206,
    gate207,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV207Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
