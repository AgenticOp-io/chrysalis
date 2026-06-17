#!/usr/bin/env node
/** Full-stack authoring batch v187 (G3169): v186 + Post-115 emit verify mega + session replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV186Smoke } from "./hub-cwl-authoring-batch-v186-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost187GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V187_KIND = "chrysalis.hub.cwl-authoring-batch-v187";
export const HUB_CWL_AUTHORING_BATCH_V187_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV187Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV186 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV186Smoke(resolvePriorBatchOpts(opts, 186));
  const gate187 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost187GraduationGate({ repoRoot });
  const ok = batchV186.ok === true && gate187.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V187_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V187_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate187Mode: skipPrior ? "evidence-trend" : "post187-graduation",
    batchV186,
    gate187,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV187Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
