#!/usr/bin/env node
/** Full-stack authoring batch v423 (G5529): v422 + Post-137 templates + post-50 stack replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV422Smoke } from "./hub-cwl-authoring-batch-v422-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost423GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V423_KIND = "chrysalis.hub.cwl-authoring-batch-v423";
export const HUB_CWL_AUTHORING_BATCH_V423_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV423Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV422 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV422Smoke(resolvePriorBatchOpts(opts, 422));
  const gate423 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost423GraduationGate({ repoRoot });
  const ok = batchV422.ok === true && gate423.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V423_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V423_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate423Mode: skipPrior ? "evidence-trend" : "post423-graduation",
    batchV422,
    gate423,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV423Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
