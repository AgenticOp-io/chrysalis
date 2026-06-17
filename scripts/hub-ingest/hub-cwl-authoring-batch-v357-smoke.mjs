#!/usr/bin/env node
/** Full-stack authoring batch v357 (G4869): v356 + Post-76/77 dual-origin search export replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV356Smoke } from "./hub-cwl-authoring-batch-v356-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost357GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V357_KIND = "chrysalis.hub.cwl-authoring-batch-v357";
export const HUB_CWL_AUTHORING_BATCH_V357_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV357Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV356 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV356Smoke(resolvePriorBatchOpts(opts, 356));
  const gate357 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost357GraduationGate({ repoRoot });
  const ok = batchV356.ok === true && gate357.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V357_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V357_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate357Mode: skipPrior ? "evidence-trend" : "post357-graduation",
    batchV356,
    gate357,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV357Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
