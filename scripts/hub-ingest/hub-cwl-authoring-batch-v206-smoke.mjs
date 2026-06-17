#!/usr/bin/env node
/** Full-stack authoring batch v206 (G3359): v205 + Post-50 fullstack HTTP + gaps depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV205Smoke } from "./hub-cwl-authoring-batch-v205-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost206GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V206_KIND = "chrysalis.hub.cwl-authoring-batch-v206";
export const HUB_CWL_AUTHORING_BATCH_V206_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV206Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV205 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV205Smoke(resolvePriorBatchOpts(opts, 205));
  const gate206 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost206GraduationGate({ repoRoot });
  const ok = batchV205.ok === true && gate206.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V206_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V206_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate206Mode: skipPrior ? "evidence-trend" : "post206-graduation",
    batchV205,
    gate206,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV206Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
