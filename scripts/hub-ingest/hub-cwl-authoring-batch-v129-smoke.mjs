#!/usr/bin/env node
/** Full-stack authoring batch v129 (G2589): v128 + IR helper lifting semantic depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV128Smoke } from "./hub-cwl-authoring-batch-v128-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost129GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V129_KIND = "chrysalis.hub.cwl-authoring-batch-v129";
export const HUB_CWL_AUTHORING_BATCH_V129_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV129Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV128 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV128Smoke(resolvePriorBatchOpts(opts, 128));
  const gate129 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost129GraduationGate({ repoRoot });
  const ok = batchV128.ok === true && gate129.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V129_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V129_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate129Mode: skipPrior ? "evidence-trend" : "post129-graduation",
    batchV128,
    gate129,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV129Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
