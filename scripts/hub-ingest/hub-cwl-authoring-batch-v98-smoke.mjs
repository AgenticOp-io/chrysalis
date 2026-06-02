#!/usr/bin/env node
/** Full-stack authoring batch v98 (G2131): v97 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV97Smoke } from "./hub-cwl-authoring-batch-v97-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost97GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPostTranslateVerifyOriginGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V98_KIND = "chrysalis.hub.cwl-authoring-batch-v98";
export const HUB_CWL_AUTHORING_BATCH_V98_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV98Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV97 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV97Smoke(resolvePriorBatchOpts(opts, 97));
  const gate98 = skipPrior
    ? await runPostTranslateVerifyOriginGate()
    : await runPost97GraduationGate({ repoRoot });
  const ok = batchV97.ok === true && gate98.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V98_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V98_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate98Mode: skipPrior ? "post-translate-verify-origin" : "post97-graduation",
    batchV97,
    gate98,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV98Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
