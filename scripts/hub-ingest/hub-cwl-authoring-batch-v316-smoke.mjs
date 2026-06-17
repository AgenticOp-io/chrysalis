#!/usr/bin/env node
/** Full-stack authoring batch v316 (G4459): v315 + Post-89 month-23 lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV315Smoke } from "./hub-cwl-authoring-batch-v315-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost316GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V316_KIND = "chrysalis.hub.cwl-authoring-batch-v316";
export const HUB_CWL_AUTHORING_BATCH_V316_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV316Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV315 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV315Smoke(resolvePriorBatchOpts(opts, 315));
  const gate316 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost316GraduationGate({ repoRoot });
  const ok = batchV315.ok === true && gate316.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V316_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V316_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate316Mode: skipPrior ? "evidence-trend" : "post316-graduation",
    batchV315,
    gate316,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV316Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
