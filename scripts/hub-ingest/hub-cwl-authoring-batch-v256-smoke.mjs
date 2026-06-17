#!/usr/bin/env node
/** Full-stack authoring batch v256 (G3859): v255 + Post-112 template/budget replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV255Smoke } from "./hub-cwl-authoring-batch-v255-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost256GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V256_KIND = "chrysalis.hub.cwl-authoring-batch-v256";
export const HUB_CWL_AUTHORING_BATCH_V256_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV256Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV255 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV255Smoke(resolvePriorBatchOpts(opts, 255));
  const gate256 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost256GraduationGate({ repoRoot });
  const ok = batchV255.ok === true && gate256.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V256_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V256_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate256Mode: skipPrior ? "evidence-trend" : "post256-graduation",
    batchV255,
    gate256,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV256Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
