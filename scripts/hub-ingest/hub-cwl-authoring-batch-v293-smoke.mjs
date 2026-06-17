#!/usr/bin/env node
/** Full-stack authoring batch v293 (G4229): v292 + Post-66 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV292Smoke } from "./hub-cwl-authoring-batch-v292-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost293GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V293_KIND = "chrysalis.hub.cwl-authoring-batch-v293";
export const HUB_CWL_AUTHORING_BATCH_V293_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV293Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV292 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV292Smoke(resolvePriorBatchOpts(opts, 292));
  const gate293 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost293GraduationGate({ repoRoot });
  const ok = batchV292.ok === true && gate293.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V293_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V293_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate293Mode: skipPrior ? "evidence-trend" : "post293-graduation",
    batchV292,
    gate293,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV293Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
