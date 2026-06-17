#!/usr/bin/env node
/** Full-stack authoring batch v210 (G3399): v209 + Post-61 preview dev + post-60 replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV209Smoke } from "./hub-cwl-authoring-batch-v209-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost210GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V210_KIND = "chrysalis.hub.cwl-authoring-batch-v210";
export const HUB_CWL_AUTHORING_BATCH_V210_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV210Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV209 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV209Smoke(resolvePriorBatchOpts(opts, 209));
  const gate210 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost210GraduationGate({ repoRoot });
  const ok = batchV209.ok === true && gate210.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V210_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V210_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate210Mode: skipPrior ? "evidence-trend" : "post210-graduation",
    batchV209,
    gate210,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV210Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
