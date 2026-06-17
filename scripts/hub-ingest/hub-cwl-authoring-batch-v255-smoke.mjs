#!/usr/bin/env node
/** Full-stack authoring batch v255 (G3849): v254 + Post-111 Phase C pilot replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV254Smoke } from "./hub-cwl-authoring-batch-v254-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost255GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V255_KIND = "chrysalis.hub.cwl-authoring-batch-v255";
export const HUB_CWL_AUTHORING_BATCH_V255_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV255Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV254 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV254Smoke(resolvePriorBatchOpts(opts, 254));
  const gate255 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost255GraduationGate({ repoRoot });
  const ok = batchV254.ok === true && gate255.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V255_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V255_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate255Mode: skipPrior ? "evidence-trend" : "post255-graduation",
    batchV254,
    gate255,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV255Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
