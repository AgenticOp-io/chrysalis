#!/usr/bin/env node
/** Full-stack authoring batch v451 (G5807): v450 + post-451 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV450Smoke } from "./hub-cwl-authoring-batch-v450-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost451GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V451_KIND = "chrysalis.hub.cwl-authoring-batch-v451";
export const HUB_CWL_AUTHORING_BATCH_V451_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV451Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV450 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV450Smoke(resolvePriorBatchOpts(opts, 450));
  const gate451 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost451GraduationGate({ repoRoot });
  const ok = batchV450.ok === true && gate451.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V451_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V451_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate451Mode: skipPrior ? "evidence-trend" : "post451-graduation",
    batchV450,
    gate451,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV451Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
