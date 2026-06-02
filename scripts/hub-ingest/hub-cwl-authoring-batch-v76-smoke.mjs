#!/usr/bin/env node
/** Full-stack authoring batch v76 (G1911): v75 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV75Smoke } from "./hub-cwl-authoring-batch-v75-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost75GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runExpressDepthGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V76_KIND = "chrysalis.hub.cwl-authoring-batch-v76";
export const HUB_CWL_AUTHORING_BATCH_V76_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV76Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV75 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV75Smoke(resolvePriorBatchOpts(opts, 75));
  const gate76 = skipPrior
    ? await runExpressDepthGate()
    : await runPost75GraduationGate({ repoRoot });
  const ok = batchV75.ok === true && gate76.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V76_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V76_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate76Mode: skipPrior ? "express-depth" : "post75-graduation",
    batchV75,
    gate76,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV76Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
