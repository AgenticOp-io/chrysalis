#!/usr/bin/env node
/** Full-stack authoring batch v265 (G3949): v264 + Post-121 CWL preview + OpenAPI replay (Phase L lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV264Smoke } from "./hub-cwl-authoring-batch-v264-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost265GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V265_KIND = "chrysalis.hub.cwl-authoring-batch-v265";
export const HUB_CWL_AUTHORING_BATCH_V265_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV265Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV264 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV264Smoke(resolvePriorBatchOpts(opts, 264));
  const gate265 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost265GraduationGate({ repoRoot });
  const ok = batchV264.ok === true && gate265.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V265_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V265_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate265Mode: skipPrior ? "evidence-trend" : "post265-graduation",
    batchV264,
    gate265,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV265Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
