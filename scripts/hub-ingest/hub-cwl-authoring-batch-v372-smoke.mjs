#!/usr/bin/env node
/** Full-stack authoring batch v372 (G5019): v371 + Post-74 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV371Smoke } from "./hub-cwl-authoring-batch-v371-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost372GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V372_KIND = "chrysalis.hub.cwl-authoring-batch-v372";
export const HUB_CWL_AUTHORING_BATCH_V372_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV372Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV371 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV371Smoke(resolvePriorBatchOpts(opts, 371));
  const gate372 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost372GraduationGate({ repoRoot });
  const ok = batchV371.ok === true && gate372.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V372_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V372_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate372Mode: skipPrior ? "evidence-trend" : "post372-graduation",
    batchV371,
    gate372,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV372Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
