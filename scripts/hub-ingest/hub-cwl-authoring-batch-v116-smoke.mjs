#!/usr/bin/env node
/** Full-stack authoring batch v116 (G2459): v115 + Verify-gaps fullstack + chimera + translate E2E. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV115Smoke } from "./hub-cwl-authoring-batch-v115-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost116GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V116_KIND = "chrysalis.hub.cwl-authoring-batch-v116";
export const HUB_CWL_AUTHORING_BATCH_V116_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV116Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV115 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV115Smoke(resolvePriorBatchOpts(opts, 115));
  const gate116 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost116GraduationGate({ repoRoot });
  const ok = batchV115.ok === true && gate116.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V116_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V116_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate116Mode: skipPrior ? "evidence-trend" : "post116-graduation",
    batchV115,
    gate116,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV116Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
