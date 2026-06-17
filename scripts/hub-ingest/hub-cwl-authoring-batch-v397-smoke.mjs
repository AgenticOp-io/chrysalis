#!/usr/bin/env node
/** Full-stack authoring batch v397 (G5269): v396 + Post-111 Phase C pilot replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV396Smoke } from "./hub-cwl-authoring-batch-v396-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost397GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V397_KIND = "chrysalis.hub.cwl-authoring-batch-v397";
export const HUB_CWL_AUTHORING_BATCH_V397_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV397Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV396 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV396Smoke(resolvePriorBatchOpts(opts, 396));
  const gate397 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost397GraduationGate({ repoRoot });
  const ok = batchV396.ok === true && gate397.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V397_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V397_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate397Mode: skipPrior ? "evidence-trend" : "post397-graduation",
    batchV396,
    gate397,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV397Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
