#!/usr/bin/env node
/** Full-stack authoring batch v83 (G1981): v82 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV82Smoke } from "./hub-cwl-authoring-batch-v82-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost82GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runVerifyGapsFullstackActionGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V83_KIND = "chrysalis.hub.cwl-authoring-batch-v83";
export const HUB_CWL_AUTHORING_BATCH_V83_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV83Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV82 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV82Smoke(resolvePriorBatchOpts(opts, 82));
  const gate83 = skipPrior
    ? await runVerifyGapsFullstackActionGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost82GraduationGate({ repoRoot });
  const ok = batchV82.ok === true && gate83.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V83_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V83_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate83Mode: skipPrior ? "verify-gaps-fullstack-action" : "post82-graduation",
    batchV82,
    gate83,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV83Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
