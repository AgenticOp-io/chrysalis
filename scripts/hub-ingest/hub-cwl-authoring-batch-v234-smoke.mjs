#!/usr/bin/env node
/** Full-stack authoring batch v234 (G3639): v233 + Post-79 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV233Smoke } from "./hub-cwl-authoring-batch-v233-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost234GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V234_KIND = "chrysalis.hub.cwl-authoring-batch-v234";
export const HUB_CWL_AUTHORING_BATCH_V234_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV234Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV233 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV233Smoke(resolvePriorBatchOpts(opts, 233));
  const gate234 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost234GraduationGate({ repoRoot });
  const ok = batchV233.ok === true && gate234.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V234_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V234_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate234Mode: skipPrior ? "evidence-trend" : "post234-graduation",
    batchV233,
    gate234,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV234Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
