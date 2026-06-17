#!/usr/bin/env node
/** Full-stack authoring batch v299 (G4289): v298 + Post-72 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV298Smoke } from "./hub-cwl-authoring-batch-v298-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost299GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V299_KIND = "chrysalis.hub.cwl-authoring-batch-v299";
export const HUB_CWL_AUTHORING_BATCH_V299_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV299Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV298 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV298Smoke(resolvePriorBatchOpts(opts, 298));
  const gate299 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost299GraduationGate({ repoRoot });
  const ok = batchV298.ok === true && gate299.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V299_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V299_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate299Mode: skipPrior ? "evidence-trend" : "post299-graduation",
    batchV298,
    gate299,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV299Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
