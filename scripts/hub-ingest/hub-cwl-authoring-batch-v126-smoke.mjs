#!/usr/bin/env node
/** Full-stack authoring batch v126 (G2559): v125 + Tri-origin verify-gaps flagship. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV125Smoke } from "./hub-cwl-authoring-batch-v125-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost126GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V126_KIND = "chrysalis.hub.cwl-authoring-batch-v126";
export const HUB_CWL_AUTHORING_BATCH_V126_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV126Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV125 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV125Smoke(resolvePriorBatchOpts(opts, 125));
  const gate126 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost126GraduationGate({ repoRoot });
  const ok = batchV125.ok === true && gate126.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V126_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V126_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate126Mode: skipPrior ? "evidence-trend" : "post126-graduation",
    batchV125,
    gate126,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV126Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
