#!/usr/bin/env node
/** Full-stack authoring batch v96 (G2111): v95 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV95Smoke } from "./hub-cwl-authoring-batch-v95-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost95GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runLaravelAuthProbeReingestHttpGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V96_KIND = "chrysalis.hub.cwl-authoring-batch-v96";
export const HUB_CWL_AUTHORING_BATCH_V96_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV96Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV95 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV95Smoke(resolvePriorBatchOpts(opts, 95));
  const gate96 = skipPrior
    ? await runLaravelAuthProbeReingestHttpGate()
    : await runPost95GraduationGate({ repoRoot });
  const ok = batchV95.ok === true && gate96.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V96_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V96_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate96Mode: skipPrior ? "laravel-auth-probe-reingest-http" : "post95-graduation",
    batchV95,
    gate96,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV96Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
