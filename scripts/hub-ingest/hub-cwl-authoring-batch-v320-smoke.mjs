#!/usr/bin/env node
/** Full-stack authoring batch v320 (G4499): v319 + Post-103 evidence trend replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV319Smoke } from "./hub-cwl-authoring-batch-v319-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost320GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V320_KIND = "chrysalis.hub.cwl-authoring-batch-v320";
export const HUB_CWL_AUTHORING_BATCH_V320_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV320Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV319 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV319Smoke(resolvePriorBatchOpts(opts, 319));
  const gate320 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost320GraduationGate({ repoRoot });
  const ok = batchV319.ok === true && gate320.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V320_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V320_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate320Mode: skipPrior ? "evidence-trend" : "post320-graduation",
    batchV319,
    gate320,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV320Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
