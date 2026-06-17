#!/usr/bin/env node
/** Full-stack authoring batch v311 (G4409): v310 + Post-84 contract roundtrip replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV310Smoke } from "./hub-cwl-authoring-batch-v310-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost311GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V311_KIND = "chrysalis.hub.cwl-authoring-batch-v311";
export const HUB_CWL_AUTHORING_BATCH_V311_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV311Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV310 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV310Smoke(resolvePriorBatchOpts(opts, 310));
  const gate311 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost311GraduationGate({ repoRoot });
  const ok = batchV310.ok === true && gate311.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V311_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V311_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate311Mode: skipPrior ? "evidence-trend" : "post311-graduation",
    batchV310,
    gate311,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV311Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
