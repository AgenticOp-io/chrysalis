#!/usr/bin/env node
/** Full-stack authoring batch v212 (G3419): v211 + Post-70/80 month-2 mega composite replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV211Smoke } from "./hub-cwl-authoring-batch-v211-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost212GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V212_KIND = "chrysalis.hub.cwl-authoring-batch-v212";
export const HUB_CWL_AUTHORING_BATCH_V212_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV212Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV211 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV211Smoke(resolvePriorBatchOpts(opts, 211));
  const gate212 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost212GraduationGate({ repoRoot });
  const ok = batchV211.ok === true && gate212.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V212_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V212_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate212Mode: skipPrior ? "evidence-trend" : "post212-graduation",
    batchV211,
    gate212,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV212Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
