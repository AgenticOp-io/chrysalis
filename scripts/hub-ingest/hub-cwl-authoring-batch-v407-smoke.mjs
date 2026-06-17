#!/usr/bin/env node
/** Full-stack authoring batch v407 (G5369): v406 + Post-121 CWL preview + OpenAPI replay (Phase L lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV406Smoke } from "./hub-cwl-authoring-batch-v406-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost407GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V407_KIND = "chrysalis.hub.cwl-authoring-batch-v407";
export const HUB_CWL_AUTHORING_BATCH_V407_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV407Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV406 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV406Smoke(resolvePriorBatchOpts(opts, 406));
  const gate407 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost407GraduationGate({ repoRoot });
  const ok = batchV406.ok === true && gate407.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V407_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V407_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate407Mode: skipPrior ? "evidence-trend" : "post407-graduation",
    batchV406,
    gate407,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV407Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
