#!/usr/bin/env node
/** Full-stack authoring batch v454 (G5837): v453 + post-454 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV453Smoke } from "./hub-cwl-authoring-batch-v453-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost454GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V454_KIND = "chrysalis.hub.cwl-authoring-batch-v454";
export const HUB_CWL_AUTHORING_BATCH_V454_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV454Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV453 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV453Smoke(resolvePriorBatchOpts(opts, 453));
  const gate454 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost454GraduationGate({ repoRoot });
  const ok = batchV453.ok === true && gate454.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V454_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V454_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate454Mode: skipPrior ? "evidence-trend" : "post454-graduation",
    batchV453,
    gate454,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV454Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
