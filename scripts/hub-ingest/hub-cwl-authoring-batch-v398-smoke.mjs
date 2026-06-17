#!/usr/bin/env node
/** Full-stack authoring batch v398 (G5279): v397 + Post-112 template/budget replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV397Smoke } from "./hub-cwl-authoring-batch-v397-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost398GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V398_KIND = "chrysalis.hub.cwl-authoring-batch-v398";
export const HUB_CWL_AUTHORING_BATCH_V398_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV398Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV397 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV397Smoke(resolvePriorBatchOpts(opts, 397));
  const gate398 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost398GraduationGate({ repoRoot });
  const ok = batchV397.ok === true && gate398.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V398_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V398_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate398Mode: skipPrior ? "evidence-trend" : "post398-graduation",
    batchV397,
    gate398,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV398Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
