#!/usr/bin/env node
/** Full-stack authoring batch v248 (G3779): v247 + Post-103 evidence trend replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV247Smoke } from "./hub-cwl-authoring-batch-v247-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost248GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V248_KIND = "chrysalis.hub.cwl-authoring-batch-v248";
export const HUB_CWL_AUTHORING_BATCH_V248_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV248Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV247 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV247Smoke(resolvePriorBatchOpts(opts, 247));
  const gate248 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost248GraduationGate({ repoRoot });
  const ok = batchV247.ok === true && gate248.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V248_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V248_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate248Mode: skipPrior ? "evidence-trend" : "post248-graduation",
    batchV247,
    gate248,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV248Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
