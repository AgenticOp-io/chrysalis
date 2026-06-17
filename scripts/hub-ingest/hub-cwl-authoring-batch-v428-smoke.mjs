#!/usr/bin/env node
/** Full-stack authoring batch v428 (G5579): v427 + Post-76/77 dual-origin search export replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV427Smoke } from "./hub-cwl-authoring-batch-v427-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost428GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V428_KIND = "chrysalis.hub.cwl-authoring-batch-v428";
export const HUB_CWL_AUTHORING_BATCH_V428_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV428Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV427 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV427Smoke(resolvePriorBatchOpts(opts, 427));
  const gate428 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost428GraduationGate({ repoRoot });
  const ok = batchV427.ok === true && gate428.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V428_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V428_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate428Mode: skipPrior ? "evidence-trend" : "post428-graduation",
    batchV427,
    gate428,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV428Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
