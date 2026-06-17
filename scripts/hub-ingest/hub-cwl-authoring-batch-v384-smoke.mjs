#!/usr/bin/env node
/** Full-stack authoring batch v384 (G5139): v383 + Post-86 CWL roundtrip replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV383Smoke } from "./hub-cwl-authoring-batch-v383-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost384GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V384_KIND = "chrysalis.hub.cwl-authoring-batch-v384";
export const HUB_CWL_AUTHORING_BATCH_V384_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV384Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV383 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV383Smoke(resolvePriorBatchOpts(opts, 383));
  const gate384 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost384GraduationGate({ repoRoot });
  const ok = batchV383.ok === true && gate384.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V384_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V384_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate384Mode: skipPrior ? "evidence-trend" : "post384-graduation",
    batchV383,
    gate384,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV384Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
