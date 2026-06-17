#!/usr/bin/env node
/** Full-stack authoring batch v268 (G3979): v267 + Post-124 bootstrap + production graduation replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV267Smoke } from "./hub-cwl-authoring-batch-v267-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost268GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V268_KIND = "chrysalis.hub.cwl-authoring-batch-v268";
export const HUB_CWL_AUTHORING_BATCH_V268_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV268Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV267 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV267Smoke(resolvePriorBatchOpts(opts, 267));
  const gate268 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost268GraduationGate({ repoRoot });
  const ok = batchV267.ok === true && gate268.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V268_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V268_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate268Mode: skipPrior ? "evidence-trend" : "post268-graduation",
    batchV267,
    gate268,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV268Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
