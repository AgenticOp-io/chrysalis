#!/usr/bin/env node
/** Full-stack authoring batch v67 (G1821): v66 + Node/Express oracle flagship gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV66Smoke } from "./hub-cwl-authoring-batch-v66-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runNodeExpressOracleFlagshipGate,
  runPost66GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V67_KIND = "chrysalis.hub.cwl-authoring-batch-v67";
export const HUB_CWL_AUTHORING_BATCH_V67_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV67Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV66 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV66Smoke(resolvePriorBatchOpts(opts, 66));
  const gate67 = skipPrior
    ? await runNodeExpressOracleFlagshipGate()
    : await runPost66GraduationGate({ repoRoot });
  const ok = batchV66.ok === true && gate67.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V67_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V67_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate67Mode: skipPrior ? "node-express-oracle" : "post66-graduation",
    batchV66,
    gate67,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV67Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
