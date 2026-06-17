#!/usr/bin/env node
/** Full-stack authoring batch v166 (G2959): v165 + Post-83 translate E2E replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV165Smoke } from "./hub-cwl-authoring-batch-v165-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost166GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V166_KIND = "chrysalis.hub.cwl-authoring-batch-v166";
export const HUB_CWL_AUTHORING_BATCH_V166_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV166Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV165 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV165Smoke(resolvePriorBatchOpts(opts, 165));
  const gate166 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost166GraduationGate({ repoRoot });
  const ok = batchV165.ok === true && gate166.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V166_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V166_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate166Mode: skipPrior ? "evidence-trend" : "post166-graduation",
    batchV165,
    gate166,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV166Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
