#!/usr/bin/env node
/** Full-stack authoring batch v442 (G5717): v441 + post-442 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV441Smoke } from "./hub-cwl-authoring-batch-v441-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost442GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V442_KIND = "chrysalis.hub.cwl-authoring-batch-v442";
export const HUB_CWL_AUTHORING_BATCH_V442_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV442Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV441 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV441Smoke(resolvePriorBatchOpts(opts, 441));
  const gate442 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost442GraduationGate({ repoRoot });
  const ok = batchV441.ok === true && gate442.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V442_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V442_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate442Mode: skipPrior ? "evidence-trend" : "post442-graduation",
    batchV441,
    gate442,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV442Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
