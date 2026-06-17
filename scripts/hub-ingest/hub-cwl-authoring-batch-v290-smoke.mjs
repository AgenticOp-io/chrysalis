#!/usr/bin/env node
/** Full-stack authoring batch v290 (G4199): v289 + Post-63 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV289Smoke } from "./hub-cwl-authoring-batch-v289-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost290GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V290_KIND = "chrysalis.hub.cwl-authoring-batch-v290";
export const HUB_CWL_AUTHORING_BATCH_V290_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV290Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV289 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV289Smoke(resolvePriorBatchOpts(opts, 289));
  const gate290 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost290GraduationGate({ repoRoot });
  const ok = batchV289.ok === true && gate290.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V290_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V290_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate290Mode: skipPrior ? "evidence-trend" : "post290-graduation",
    batchV289,
    gate290,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV290Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
