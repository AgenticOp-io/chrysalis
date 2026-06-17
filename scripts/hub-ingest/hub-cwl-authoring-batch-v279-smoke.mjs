#!/usr/bin/env node
/** Full-stack authoring batch v279 (G4089): v278 + Post-135 flagship + chimera + delivery replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV278Smoke } from "./hub-cwl-authoring-batch-v278-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost279GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V279_KIND = "chrysalis.hub.cwl-authoring-batch-v279";
export const HUB_CWL_AUTHORING_BATCH_V279_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV279Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV278 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV278Smoke(resolvePriorBatchOpts(opts, 278));
  const gate279 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost279GraduationGate({ repoRoot });
  const ok = batchV278.ok === true && gate279.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V279_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V279_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate279Mode: skipPrior ? "evidence-trend" : "post279-graduation",
    batchV278,
    gate279,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV279Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
