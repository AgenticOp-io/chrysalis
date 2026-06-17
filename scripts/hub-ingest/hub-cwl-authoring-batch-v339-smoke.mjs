#!/usr/bin/env node
/** Full-stack authoring batch v339 (G4689): v338 + Post-124 bootstrap + production graduation replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV338Smoke } from "./hub-cwl-authoring-batch-v338-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost339GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V339_KIND = "chrysalis.hub.cwl-authoring-batch-v339";
export const HUB_CWL_AUTHORING_BATCH_V339_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV339Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV338 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV338Smoke(resolvePriorBatchOpts(opts, 338));
  const gate339 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost339GraduationGate({ repoRoot });
  const ok = batchV338.ok === true && gate339.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V339_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V339_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate339Mode: skipPrior ? "evidence-trend" : "post339-graduation",
    batchV338,
    gate339,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV339Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
