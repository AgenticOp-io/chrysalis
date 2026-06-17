#!/usr/bin/env node
/** Full-stack authoring batch v368 (G4979): v367 + Post-70 composite replay depth (Phase J lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV367Smoke } from "./hub-cwl-authoring-batch-v367-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost368GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V368_KIND = "chrysalis.hub.cwl-authoring-batch-v368";
export const HUB_CWL_AUTHORING_BATCH_V368_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV368Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV367 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV367Smoke(resolvePriorBatchOpts(opts, 367));
  const gate368 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost368GraduationGate({ repoRoot });
  const ok = batchV367.ok === true && gate368.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V368_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V368_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate368Mode: skipPrior ? "evidence-trend" : "post368-graduation",
    batchV367,
    gate368,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV368Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
