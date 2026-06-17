#!/usr/bin/env node
/** Full-stack authoring batch v381 (G5109): v380 + Post-83 translate E2E replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV380Smoke } from "./hub-cwl-authoring-batch-v380-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost381GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V381_KIND = "chrysalis.hub.cwl-authoring-batch-v381";
export const HUB_CWL_AUTHORING_BATCH_V381_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV381Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV380 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV380Smoke(resolvePriorBatchOpts(opts, 380));
  const gate381 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost381GraduationGate({ repoRoot });
  const ok = batchV380.ok === true && gate381.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V381_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V381_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate381Mode: skipPrior ? "evidence-trend" : "post381-graduation",
    batchV380,
    gate381,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV381Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
