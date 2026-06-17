#!/usr/bin/env node
/** Full-stack authoring batch v173 (G3029): v172 + Post-100 session stub replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV172Smoke } from "./hub-cwl-authoring-batch-v172-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost173GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V173_KIND = "chrysalis.hub.cwl-authoring-batch-v173";
export const HUB_CWL_AUTHORING_BATCH_V173_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV173Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV172 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV172Smoke(resolvePriorBatchOpts(opts, 172));
  const gate173 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost173GraduationGate({ repoRoot });
  const ok = batchV172.ok === true && gate173.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V173_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V173_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate173Mode: skipPrior ? "evidence-trend" : "post173-graduation",
    batchV172,
    gate173,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV173Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
