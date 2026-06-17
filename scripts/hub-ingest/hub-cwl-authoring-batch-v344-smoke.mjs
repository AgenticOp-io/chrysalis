#!/usr/bin/env node
/** Full-stack authoring batch v344 (G4739): v343 + Post-129 IR helper lifting replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV343Smoke } from "./hub-cwl-authoring-batch-v343-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost344GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V344_KIND = "chrysalis.hub.cwl-authoring-batch-v344";
export const HUB_CWL_AUTHORING_BATCH_V344_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV344Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV343 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV343Smoke(resolvePriorBatchOpts(opts, 343));
  const gate344 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost344GraduationGate({ repoRoot });
  const ok = batchV343.ok === true && gate344.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V344_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V344_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate344Mode: skipPrior ? "evidence-trend" : "post344-graduation",
    batchV343,
    gate344,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV344Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
