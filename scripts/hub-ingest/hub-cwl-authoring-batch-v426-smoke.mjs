#!/usr/bin/env node
/** Full-stack authoring batch v426 (G5559): v425 + Post-140 month-2 mega composite replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV425Smoke } from "./hub-cwl-authoring-batch-v425-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost426GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V426_KIND = "chrysalis.hub.cwl-authoring-batch-v426";
export const HUB_CWL_AUTHORING_BATCH_V426_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV426Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV425 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV425Smoke(resolvePriorBatchOpts(opts, 425));
  const gate426 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost426GraduationGate({ repoRoot });
  const ok = batchV425.ok === true && gate426.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V426_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V426_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate426Mode: skipPrior ? "evidence-trend" : "post426-graduation",
    batchV425,
    gate426,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV426Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
