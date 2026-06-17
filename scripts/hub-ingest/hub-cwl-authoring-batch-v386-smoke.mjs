#!/usr/bin/env node
/** Full-stack authoring batch v386 (G5159): v385 + Post-88 month-2 mega replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV385Smoke } from "./hub-cwl-authoring-batch-v385-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost386GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V386_KIND = "chrysalis.hub.cwl-authoring-batch-v386";
export const HUB_CWL_AUTHORING_BATCH_V386_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV386Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV385 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV385Smoke(resolvePriorBatchOpts(opts, 385));
  const gate386 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost386GraduationGate({ repoRoot });
  const ok = batchV385.ok === true && gate386.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V386_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V386_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate386Mode: skipPrior ? "evidence-trend" : "post386-graduation",
    batchV385,
    gate386,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV386Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
