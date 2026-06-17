#!/usr/bin/env node
/** Full-stack authoring batch v221 (G3509): v220 + Post-66 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV220Smoke } from "./hub-cwl-authoring-batch-v220-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost221GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V221_KIND = "chrysalis.hub.cwl-authoring-batch-v221";
export const HUB_CWL_AUTHORING_BATCH_V221_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV221Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV220 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV220Smoke(resolvePriorBatchOpts(opts, 220));
  const gate221 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost221GraduationGate({ repoRoot });
  const ok = batchV220.ok === true && gate221.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V221_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V221_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate221Mode: skipPrior ? "evidence-trend" : "post221-graduation",
    batchV220,
    gate221,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV221Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
