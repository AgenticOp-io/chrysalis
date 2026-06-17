#!/usr/bin/env node
/** Full-stack authoring batch v137 (G2669): v136 + Post-60 templates + post-50 stack. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV136Smoke } from "./hub-cwl-authoring-batch-v136-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost137GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V137_KIND = "chrysalis.hub.cwl-authoring-batch-v137";
export const HUB_CWL_AUTHORING_BATCH_V137_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV137Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV136 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV136Smoke(resolvePriorBatchOpts(opts, 136));
  const gate137 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost137GraduationGate({ repoRoot });
  const ok = batchV136.ok === true && gate137.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V137_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V137_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate137Mode: skipPrior ? "evidence-trend" : "post137-graduation",
    batchV136,
    gate137,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV137Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
