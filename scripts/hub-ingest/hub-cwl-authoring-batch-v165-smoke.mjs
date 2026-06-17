#!/usr/bin/env node
/** Full-stack authoring batch v165 (G2949): v164 + Post-82 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV164Smoke } from "./hub-cwl-authoring-batch-v164-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost165GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V165_KIND = "chrysalis.hub.cwl-authoring-batch-v165";
export const HUB_CWL_AUTHORING_BATCH_V165_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV165Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV164 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV164Smoke(resolvePriorBatchOpts(opts, 164));
  const gate165 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost165GraduationGate({ repoRoot });
  const ok = batchV164.ok === true && gate165.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V165_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V165_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate165Mode: skipPrior ? "evidence-trend" : "post165-graduation",
    batchV164,
    gate165,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV165Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
