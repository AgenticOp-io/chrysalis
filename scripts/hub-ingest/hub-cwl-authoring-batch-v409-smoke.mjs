#!/usr/bin/env node
/** Full-stack authoring batch v409 (G5389): v408 + Post-123 query HTML + layout search replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV408Smoke } from "./hub-cwl-authoring-batch-v408-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost409GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V409_KIND = "chrysalis.hub.cwl-authoring-batch-v409";
export const HUB_CWL_AUTHORING_BATCH_V409_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV409Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV408 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV408Smoke(resolvePriorBatchOpts(opts, 408));
  const gate409 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost409GraduationGate({ repoRoot });
  const ok = batchV408.ok === true && gate409.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V409_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V409_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate409Mode: skipPrior ? "evidence-trend" : "post409-graduation",
    batchV408,
    gate409,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV409Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
