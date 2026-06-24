#!/usr/bin/env node
/** Full-stack authoring batch v441 (G5707): v440 + post-441 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV440Smoke } from "./hub-cwl-authoring-batch-v440-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost441GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V441_KIND = "chrysalis.hub.cwl-authoring-batch-v441";
export const HUB_CWL_AUTHORING_BATCH_V441_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV441Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV440 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV440Smoke(resolvePriorBatchOpts(opts, 440));
  const gate441 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost441GraduationGate({ repoRoot });
  const ok = batchV440.ok === true && gate441.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V441_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V441_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate441Mode: skipPrior ? "evidence-trend" : "post441-graduation",
    batchV440,
    gate441,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV441Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
