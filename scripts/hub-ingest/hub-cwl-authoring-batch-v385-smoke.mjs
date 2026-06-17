#!/usr/bin/env node
/** Full-stack authoring batch v385 (G5149): v384 + Post-87 month-2 pilot replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV384Smoke } from "./hub-cwl-authoring-batch-v384-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost385GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V385_KIND = "chrysalis.hub.cwl-authoring-batch-v385";
export const HUB_CWL_AUTHORING_BATCH_V385_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV385Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV384 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV384Smoke(resolvePriorBatchOpts(opts, 384));
  const gate385 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost385GraduationGate({ repoRoot });
  const ok = batchV384.ok === true && gate385.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V385_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V385_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate385Mode: skipPrior ? "evidence-trend" : "post385-graduation",
    batchV384,
    gate385,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV385Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
