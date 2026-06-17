#!/usr/bin/env node
/** Full-stack authoring batch v364 (G4939): v363 + Post-66 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV363Smoke } from "./hub-cwl-authoring-batch-v363-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost364GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V364_KIND = "chrysalis.hub.cwl-authoring-batch-v364";
export const HUB_CWL_AUTHORING_BATCH_V364_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV364Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV363 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV363Smoke(resolvePriorBatchOpts(opts, 363));
  const gate364 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost364GraduationGate({ repoRoot });
  const ok = batchV363.ok === true && gate364.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V364_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V364_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate364Mode: skipPrior ? "evidence-trend" : "post364-graduation",
    batchV363,
    gate364,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV364Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
