#!/usr/bin/env node
/** Full-stack authoring batch v332 (G4619): v331 + Post-117 contract + CWL roundtrip replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV331Smoke } from "./hub-cwl-authoring-batch-v331-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost332GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V332_KIND = "chrysalis.hub.cwl-authoring-batch-v332";
export const HUB_CWL_AUTHORING_BATCH_V332_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV332Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV331 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV331Smoke(resolvePriorBatchOpts(opts, 331));
  const gate332 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost332GraduationGate({ repoRoot });
  const ok = batchV331.ok === true && gate332.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V332_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V332_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate332Mode: skipPrior ? "evidence-trend" : "post332-graduation",
    batchV331,
    gate332,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV332Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
