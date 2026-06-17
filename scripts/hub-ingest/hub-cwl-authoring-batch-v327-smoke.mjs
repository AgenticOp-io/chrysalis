#!/usr/bin/env node
/** Full-stack authoring batch v327 (G4569): v326 + Post-112 template/budget replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV326Smoke } from "./hub-cwl-authoring-batch-v326-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost327GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V327_KIND = "chrysalis.hub.cwl-authoring-batch-v327";
export const HUB_CWL_AUTHORING_BATCH_V327_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV327Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV326 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV326Smoke(resolvePriorBatchOpts(opts, 326));
  const gate327 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost327GraduationGate({ repoRoot });
  const ok = batchV326.ok === true && gate327.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V327_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V327_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate327Mode: skipPrior ? "evidence-trend" : "post327-graduation",
    batchV326,
    gate327,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV327Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
