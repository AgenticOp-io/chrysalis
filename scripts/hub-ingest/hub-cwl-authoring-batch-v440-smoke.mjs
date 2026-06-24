#!/usr/bin/env node
/** Full-stack authoring batch v440 (G5697): v439 + post-440 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV439Smoke } from "./hub-cwl-authoring-batch-v439-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost440GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V440_KIND = "chrysalis.hub.cwl-authoring-batch-v440";
export const HUB_CWL_AUTHORING_BATCH_V440_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV440Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV439 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV439Smoke(resolvePriorBatchOpts(opts, 439));
  const gate440 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost440GraduationGate({ repoRoot });
  const ok = batchV439.ok === true && gate440.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V440_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V440_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate440Mode: skipPrior ? "evidence-trend" : "post440-graduation",
    batchV439,
    gate440,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV440Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
