#!/usr/bin/env node
/** Full-stack authoring batch v133 (G2629): v132 + Post-60 authoring composite. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV132Smoke } from "./hub-cwl-authoring-batch-v132-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost133GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V133_KIND = "chrysalis.hub.cwl-authoring-batch-v133";
export const HUB_CWL_AUTHORING_BATCH_V133_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV133Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV132 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV132Smoke(resolvePriorBatchOpts(opts, 132));
  const gate133 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost133GraduationGate({ repoRoot });
  const ok = batchV132.ok === true && gate133.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V133_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V133_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate133Mode: skipPrior ? "evidence-trend" : "post133-graduation",
    batchV132,
    gate133,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV133Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
