#!/usr/bin/env node
/** Full-stack authoring batch v134 (G2639): v133 + Post-50 fullstack HTTP + gaps depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV133Smoke } from "./hub-cwl-authoring-batch-v133-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost134GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V134_KIND = "chrysalis.hub.cwl-authoring-batch-v134";
export const HUB_CWL_AUTHORING_BATCH_V134_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV134Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV133 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV133Smoke(resolvePriorBatchOpts(opts, 133));
  const gate134 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost134GraduationGate({ repoRoot });
  const ok = batchV133.ok === true && gate134.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V134_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V134_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate134Mode: skipPrior ? "evidence-trend" : "post134-graduation",
    batchV133,
    gate134,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV134Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
