#!/usr/bin/env node
/** Full-stack authoring batch v295 (G4249): v294 + Post-68 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV294Smoke } from "./hub-cwl-authoring-batch-v294-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost295GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V295_KIND = "chrysalis.hub.cwl-authoring-batch-v295";
export const HUB_CWL_AUTHORING_BATCH_V295_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV295Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV294 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV294Smoke(resolvePriorBatchOpts(opts, 294));
  const gate295 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost295GraduationGate({ repoRoot });
  const ok = batchV294.ok === true && gate295.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V295_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V295_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate295Mode: skipPrior ? "evidence-trend" : "post295-graduation",
    batchV294,
    gate295,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV295Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
