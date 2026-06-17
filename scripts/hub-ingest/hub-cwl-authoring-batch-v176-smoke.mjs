#!/usr/bin/env node
/** Full-stack authoring batch v176 (G3059): v175 + Post-103 evidence trend replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV175Smoke } from "./hub-cwl-authoring-batch-v175-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost176GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V176_KIND = "chrysalis.hub.cwl-authoring-batch-v176";
export const HUB_CWL_AUTHORING_BATCH_V176_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV176Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV175 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV175Smoke(resolvePriorBatchOpts(opts, 175));
  const gate176 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost176GraduationGate({ repoRoot });
  const ok = batchV175.ok === true && gate176.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V176_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V176_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate176Mode: skipPrior ? "evidence-trend" : "post176-graduation",
    batchV175,
    gate176,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV176Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
