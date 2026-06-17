#!/usr/bin/env node
/** Full-stack authoring batch v289 (G4189): v288 + Phase D graduation lock (hub ops mega) replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV288Smoke } from "./hub-cwl-authoring-batch-v288-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost289GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V289_KIND = "chrysalis.hub.cwl-authoring-batch-v289";
export const HUB_CWL_AUTHORING_BATCH_V289_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV289Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV288 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV288Smoke(resolvePriorBatchOpts(opts, 288));
  const gate289 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost289GraduationGate({ repoRoot });
  const ok = batchV288.ok === true && gate289.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V289_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V289_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate289Mode: skipPrior ? "evidence-trend" : "post289-graduation",
    batchV288,
    gate289,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV289Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
