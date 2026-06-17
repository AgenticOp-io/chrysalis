#!/usr/bin/env node
/** Full-stack authoring batch v120 (G2499): v119 + HTTP verify + express oracle depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV119Smoke } from "./hub-cwl-authoring-batch-v119-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost120GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V120_KIND = "chrysalis.hub.cwl-authoring-batch-v120";
export const HUB_CWL_AUTHORING_BATCH_V120_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV120Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV119 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV119Smoke(resolvePriorBatchOpts(opts, 119));
  const gate120 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost120GraduationGate({ repoRoot });
  const ok = batchV119.ok === true && gate120.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V120_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V120_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate120Mode: skipPrior ? "evidence-trend" : "post120-graduation",
    batchV119,
    gate120,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV120Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
