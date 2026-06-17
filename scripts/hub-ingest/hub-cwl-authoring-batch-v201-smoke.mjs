#!/usr/bin/env node
/** Full-stack authoring batch v201 (G3309): v200 + Post-129 IR helper lifting replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV200Smoke } from "./hub-cwl-authoring-batch-v200-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost201GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V201_KIND = "chrysalis.hub.cwl-authoring-batch-v201";
export const HUB_CWL_AUTHORING_BATCH_V201_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV201Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV200 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV200Smoke(resolvePriorBatchOpts(opts, 200));
  const gate201 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost201GraduationGate({ repoRoot });
  const ok = batchV200.ok === true && gate201.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V201_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V201_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate201Mode: skipPrior ? "evidence-trend" : "post201-graduation",
    batchV200,
    gate201,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV201Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
