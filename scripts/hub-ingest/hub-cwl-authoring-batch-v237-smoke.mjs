#!/usr/bin/env node
/** Full-stack authoring batch v237 (G3669): v236 + Post-82 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV236Smoke } from "./hub-cwl-authoring-batch-v236-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost237GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V237_KIND = "chrysalis.hub.cwl-authoring-batch-v237";
export const HUB_CWL_AUTHORING_BATCH_V237_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV237Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV236 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV236Smoke(resolvePriorBatchOpts(opts, 236));
  const gate237 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost237GraduationGate({ repoRoot });
  const ok = batchV236.ok === true && gate237.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V237_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V237_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate237Mode: skipPrior ? "evidence-trend" : "post237-graduation",
    batchV236,
    gate237,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV237Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
