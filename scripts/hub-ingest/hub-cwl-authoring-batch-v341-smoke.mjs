#!/usr/bin/env node
/** Full-stack authoring batch v341 (G4709): v340 + Post-126 tri-origin verify-gaps replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV340Smoke } from "./hub-cwl-authoring-batch-v340-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost341GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V341_KIND = "chrysalis.hub.cwl-authoring-batch-v341";
export const HUB_CWL_AUTHORING_BATCH_V341_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV341Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV340 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV340Smoke(resolvePriorBatchOpts(opts, 340));
  const gate341 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost341GraduationGate({ repoRoot });
  const ok = batchV340.ok === true && gate341.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V341_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V341_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate341Mode: skipPrior ? "evidence-trend" : "post341-graduation",
    batchV340,
    gate341,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV341Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
