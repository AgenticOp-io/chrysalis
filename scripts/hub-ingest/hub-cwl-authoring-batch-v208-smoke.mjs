#!/usr/bin/env node
/** Full-stack authoring batch v208 (G3379): v207 + Post-30 runtime + verify-gaps parity replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV207Smoke } from "./hub-cwl-authoring-batch-v207-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost208GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V208_KIND = "chrysalis.hub.cwl-authoring-batch-v208";
export const HUB_CWL_AUTHORING_BATCH_V208_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV208Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV207 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV207Smoke(resolvePriorBatchOpts(opts, 207));
  const gate208 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost208GraduationGate({ repoRoot });
  const ok = batchV207.ok === true && gate208.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V208_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V208_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate208Mode: skipPrior ? "evidence-trend" : "post208-graduation",
    batchV207,
    gate208,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV208Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
