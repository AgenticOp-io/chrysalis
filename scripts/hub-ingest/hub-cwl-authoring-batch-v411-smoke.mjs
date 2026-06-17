#!/usr/bin/env node
/** Full-stack authoring batch v411 (G5409): v410 + Post-125 Phase C graduation lock replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV410Smoke } from "./hub-cwl-authoring-batch-v410-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost411GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V411_KIND = "chrysalis.hub.cwl-authoring-batch-v411";
export const HUB_CWL_AUTHORING_BATCH_V411_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV411Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV410 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV410Smoke(resolvePriorBatchOpts(opts, 410));
  const gate411 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost411GraduationGate({ repoRoot });
  const ok = batchV410.ok === true && gate411.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V411_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V411_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate411Mode: skipPrior ? "evidence-trend" : "post411-graduation",
    batchV410,
    gate411,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV411Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
