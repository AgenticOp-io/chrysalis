#!/usr/bin/env node
/** Full-stack authoring batch v413 (G5429): v412 + Post-127 verify-gaps ingest closure replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV412Smoke } from "./hub-cwl-authoring-batch-v412-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost413GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V413_KIND = "chrysalis.hub.cwl-authoring-batch-v413";
export const HUB_CWL_AUTHORING_BATCH_V413_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV413Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV412 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV412Smoke(resolvePriorBatchOpts(opts, 412));
  const gate413 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost413GraduationGate({ repoRoot });
  const ok = batchV412.ok === true && gate413.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V413_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V413_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate413Mode: skipPrior ? "evidence-trend" : "post413-graduation",
    batchV412,
    gate413,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV413Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
