#!/usr/bin/env node
/** Full-stack authoring batch v280 (G4099): v279 + Post-136 runtime + verify-gaps parity replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV279Smoke } from "./hub-cwl-authoring-batch-v279-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost280GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V280_KIND = "chrysalis.hub.cwl-authoring-batch-v280";
export const HUB_CWL_AUTHORING_BATCH_V280_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV280Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV279 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV279Smoke(resolvePriorBatchOpts(opts, 279));
  const gate280 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost280GraduationGate({ repoRoot });
  const ok = batchV279.ok === true && gate280.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V280_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V280_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate280Mode: skipPrior ? "evidence-trend" : "post280-graduation",
    batchV279,
    gate280,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV280Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
