#!/usr/bin/env node
/** Full-stack authoring batch v247 (G3769): v246 + Post-102 emit probe replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV246Smoke } from "./hub-cwl-authoring-batch-v246-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost247GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V247_KIND = "chrysalis.hub.cwl-authoring-batch-v247";
export const HUB_CWL_AUTHORING_BATCH_V247_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV247Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV246 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV246Smoke(resolvePriorBatchOpts(opts, 246));
  const gate247 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost247GraduationGate({ repoRoot });
  const ok = batchV246.ok === true && gate247.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V247_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V247_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate247Mode: skipPrior ? "evidence-trend" : "post247-graduation",
    batchV246,
    gate247,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV247Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
