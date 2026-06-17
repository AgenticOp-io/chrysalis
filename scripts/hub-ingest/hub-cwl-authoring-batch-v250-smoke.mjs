#!/usr/bin/env node
/** Full-stack authoring batch v250 (G3799): v249 + Post-105 oracle product ultra replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV249Smoke } from "./hub-cwl-authoring-batch-v249-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost250GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V250_KIND = "chrysalis.hub.cwl-authoring-batch-v250";
export const HUB_CWL_AUTHORING_BATCH_V250_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV250Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV249 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV249Smoke(resolvePriorBatchOpts(opts, 249));
  const gate250 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost250GraduationGate({ repoRoot });
  const ok = batchV249.ok === true && gate250.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V250_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V250_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate250Mode: skipPrior ? "evidence-trend" : "post250-graduation",
    batchV249,
    gate250,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV250Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
