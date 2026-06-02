#!/usr/bin/env node
/** Full-stack authoring batch v102 (G2171): v101 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV101Smoke } from "./hub-cwl-authoring-batch-v101-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost101GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runRuntimeProductionV2Gate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V102_KIND = "chrysalis.hub.cwl-authoring-batch-v102";
export const HUB_CWL_AUTHORING_BATCH_V102_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV102Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV101 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV101Smoke(resolvePriorBatchOpts(opts, 101));
  const gate102 = skipPrior
    ? await runRuntimeProductionV2Gate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost101GraduationGate({ repoRoot });
  const ok = batchV101.ok === true && gate102.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V102_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V102_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate102Mode: skipPrior ? "runtime-production" : "post101-graduation",
    batchV101,
    gate102,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV102Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
