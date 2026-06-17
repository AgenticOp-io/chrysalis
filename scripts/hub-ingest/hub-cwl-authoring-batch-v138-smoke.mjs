#!/usr/bin/env node
/** Full-stack authoring batch v138 (G2679): v137 + Post-61 preview dev + post-60. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV137Smoke } from "./hub-cwl-authoring-batch-v137-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost138GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V138_KIND = "chrysalis.hub.cwl-authoring-batch-v138";
export const HUB_CWL_AUTHORING_BATCH_V138_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV138Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV137 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV137Smoke(resolvePriorBatchOpts(opts, 137));
  const gate138 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost138GraduationGate({ repoRoot });
  const ok = batchV137.ok === true && gate138.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V138_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V138_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate138Mode: skipPrior ? "evidence-trend" : "post138-graduation",
    batchV137,
    gate138,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV138Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
