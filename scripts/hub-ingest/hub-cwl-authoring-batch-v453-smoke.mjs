#!/usr/bin/env node
/** Full-stack authoring batch v453 (G5827): v452 + post-453 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV452Smoke } from "./hub-cwl-authoring-batch-v452-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost453GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V453_KIND = "chrysalis.hub.cwl-authoring-batch-v453";
export const HUB_CWL_AUTHORING_BATCH_V453_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV453Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV452 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV452Smoke(resolvePriorBatchOpts(opts, 452));
  const gate453 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost453GraduationGate({ repoRoot });
  const ok = batchV452.ok === true && gate453.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V453_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V453_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate453Mode: skipPrior ? "evidence-trend" : "post453-graduation",
    batchV452,
    gate453,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV453Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
