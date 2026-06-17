#!/usr/bin/env node
/** Full-stack authoring batch v131 (G2609): v130 + Session + production runtime + emit probe. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV130Smoke } from "./hub-cwl-authoring-batch-v130-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost131GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V131_KIND = "chrysalis.hub.cwl-authoring-batch-v131";
export const HUB_CWL_AUTHORING_BATCH_V131_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV131Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV130 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV130Smoke(resolvePriorBatchOpts(opts, 130));
  const gate131 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost131GraduationGate({ repoRoot });
  const ok = batchV130.ok === true && gate131.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V131_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V131_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate131Mode: skipPrior ? "evidence-trend" : "post131-graduation",
    batchV130,
    gate131,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV131Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
