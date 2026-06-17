#!/usr/bin/env node
/** Full-stack authoring batch v342 (G4719): v341 + Post-127 verify-gaps ingest closure replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV341Smoke } from "./hub-cwl-authoring-batch-v341-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost342GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V342_KIND = "chrysalis.hub.cwl-authoring-batch-v342";
export const HUB_CWL_AUTHORING_BATCH_V342_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV342Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV341 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV341Smoke(resolvePriorBatchOpts(opts, 341));
  const gate342 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost342GraduationGate({ repoRoot });
  const ok = batchV341.ok === true && gate342.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V342_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V342_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate342Mode: skipPrior ? "evidence-trend" : "post342-graduation",
    batchV341,
    gate342,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV342Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
