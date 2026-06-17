#!/usr/bin/env node
/** Full-stack authoring batch v370 (G4999): v369 + Post-72 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV369Smoke } from "./hub-cwl-authoring-batch-v369-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost370GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V370_KIND = "chrysalis.hub.cwl-authoring-batch-v370";
export const HUB_CWL_AUTHORING_BATCH_V370_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV370Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV369 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV369Smoke(resolvePriorBatchOpts(opts, 369));
  const gate370 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost370GraduationGate({ repoRoot });
  const ok = batchV369.ok === true && gate370.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V370_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V370_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate370Mode: skipPrior ? "evidence-trend" : "post370-graduation",
    batchV369,
    gate370,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV370Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
