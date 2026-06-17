#!/usr/bin/env node
/** Full-stack authoring batch v436 (G5659): v435 + Post-67 composite replay depth (Phase Q lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV435Smoke } from "./hub-cwl-authoring-batch-v435-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost436GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V436_KIND = "chrysalis.hub.cwl-authoring-batch-v436";
export const HUB_CWL_AUTHORING_BATCH_V436_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV436Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV435 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV435Smoke(resolvePriorBatchOpts(opts, 435));
  const gate436 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost436GraduationGate({ repoRoot });
  const ok = batchV435.ok === true && gate436.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V436_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V436_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate436Mode: skipPrior ? "evidence-trend" : "post436-graduation",
    batchV435,
    gate436,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV436Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
