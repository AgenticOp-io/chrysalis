#!/usr/bin/env node
/** Full-stack authoring batch v199 (G3289): v198 + Post-127 verify-gaps ingest closure replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV198Smoke } from "./hub-cwl-authoring-batch-v198-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost199GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V199_KIND = "chrysalis.hub.cwl-authoring-batch-v199";
export const HUB_CWL_AUTHORING_BATCH_V199_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV199Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV198 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV198Smoke(resolvePriorBatchOpts(opts, 198));
  const gate199 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost199GraduationGate({ repoRoot });
  const ok = batchV198.ok === true && gate199.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V199_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V199_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate199Mode: skipPrior ? "evidence-trend" : "post199-graduation",
    batchV198,
    gate199,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV199Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
