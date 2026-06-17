#!/usr/bin/env node
/** Full-stack authoring batch v170 (G2999): v169 + Post-87 month-2 pilot replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV169Smoke } from "./hub-cwl-authoring-batch-v169-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost170GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V170_KIND = "chrysalis.hub.cwl-authoring-batch-v170";
export const HUB_CWL_AUTHORING_BATCH_V170_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV170Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV169 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV169Smoke(resolvePriorBatchOpts(opts, 169));
  const gate170 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost170GraduationGate({ repoRoot });
  const ok = batchV169.ok === true && gate170.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V170_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V170_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate170Mode: skipPrior ? "evidence-trend" : "post170-graduation",
    batchV169,
    gate170,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV170Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
