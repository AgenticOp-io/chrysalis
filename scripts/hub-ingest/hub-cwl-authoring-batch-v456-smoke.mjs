#!/usr/bin/env node
/** Full-stack authoring batch v456 (G5857): v455 + post-456 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV455Smoke } from "./hub-cwl-authoring-batch-v455-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost456GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V456_KIND = "chrysalis.hub.cwl-authoring-batch-v456";
export const HUB_CWL_AUTHORING_BATCH_V456_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV456Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV455 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV455Smoke(resolvePriorBatchOpts(opts, 455));
  const gate456 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost456GraduationGate({ repoRoot });
  const ok = batchV455.ok === true && gate456.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V456_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V456_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate456Mode: skipPrior ? "evidence-trend" : "post456-graduation",
    batchV455,
    gate456,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV456Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
