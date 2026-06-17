#!/usr/bin/env node
/** Full-stack authoring batch v300 (G4299): v299 + Post-73 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV299Smoke } from "./hub-cwl-authoring-batch-v299-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost300GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V300_KIND = "chrysalis.hub.cwl-authoring-batch-v300";
export const HUB_CWL_AUTHORING_BATCH_V300_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV300Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV299 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV299Smoke(resolvePriorBatchOpts(opts, 299));
  const gate300 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost300GraduationGate({ repoRoot });
  const ok = batchV299.ok === true && gate300.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V300_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V300_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate300Mode: skipPrior ? "evidence-trend" : "post300-graduation",
    batchV299,
    gate300,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV300Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
