#!/usr/bin/env node
/** Full-stack authoring batch v235 (G3649): v234 + Post-80 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV234Smoke } from "./hub-cwl-authoring-batch-v234-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost235GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V235_KIND = "chrysalis.hub.cwl-authoring-batch-v235";
export const HUB_CWL_AUTHORING_BATCH_V235_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV235Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV234 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV234Smoke(resolvePriorBatchOpts(opts, 234));
  const gate235 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost235GraduationGate({ repoRoot });
  const ok = batchV234.ok === true && gate235.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V235_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V235_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate235Mode: skipPrior ? "evidence-trend" : "post235-graduation",
    batchV234,
    gate235,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV235Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
