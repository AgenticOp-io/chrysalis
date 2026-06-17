#!/usr/bin/env node
/** Full-stack authoring batch v378 (G5079): v377 + Post-80 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV377Smoke } from "./hub-cwl-authoring-batch-v377-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost378GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V378_KIND = "chrysalis.hub.cwl-authoring-batch-v378";
export const HUB_CWL_AUTHORING_BATCH_V378_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV378Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV377 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV377Smoke(resolvePriorBatchOpts(opts, 377));
  const gate378 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost378GraduationGate({ repoRoot });
  const ok = batchV377.ok === true && gate378.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V378_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V378_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate378Mode: skipPrior ? "evidence-trend" : "post378-graduation",
    batchV377,
    gate378,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV378Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
