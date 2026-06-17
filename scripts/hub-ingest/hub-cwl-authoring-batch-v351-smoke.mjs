#!/usr/bin/env node
/** Full-stack authoring batch v351 (G4809): v350 + Post-136 runtime + verify-gaps parity replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV350Smoke } from "./hub-cwl-authoring-batch-v350-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost351GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V351_KIND = "chrysalis.hub.cwl-authoring-batch-v351";
export const HUB_CWL_AUTHORING_BATCH_V351_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV351Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV350 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV350Smoke(resolvePriorBatchOpts(opts, 350));
  const gate351 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost351GraduationGate({ repoRoot });
  const ok = batchV350.ok === true && gate351.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V351_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V351_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate351Mode: skipPrior ? "evidence-trend" : "post351-graduation",
    batchV350,
    gate351,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV351Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
