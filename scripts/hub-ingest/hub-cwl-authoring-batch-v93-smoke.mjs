#!/usr/bin/env node
/** Full-stack authoring batch v93 (G2081): v92 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV92Smoke } from "./hub-cwl-authoring-batch-v92-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost92GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runVerifyGapsLaravelMinFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V93_KIND = "chrysalis.hub.cwl-authoring-batch-v93";
export const HUB_CWL_AUTHORING_BATCH_V93_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV93Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV92 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV92Smoke(resolvePriorBatchOpts(opts, 92));
  const gate93 = skipPrior
    ? await runVerifyGapsLaravelMinFlagshipGate()
    : await runPost92GraduationGate({ repoRoot });
  const ok = batchV92.ok === true && gate93.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V93_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V93_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate93Mode: skipPrior ? "verify-gaps-laravel-min" : "post92-graduation",
    batchV92,
    gate93,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV93Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
