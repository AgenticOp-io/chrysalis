#!/usr/bin/env node
/** Full-stack authoring batch v375 (G5049): v374 + Post-77 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV374Smoke } from "./hub-cwl-authoring-batch-v374-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost375GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V375_KIND = "chrysalis.hub.cwl-authoring-batch-v375";
export const HUB_CWL_AUTHORING_BATCH_V375_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV375Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV374 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV374Smoke(resolvePriorBatchOpts(opts, 374));
  const gate375 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost375GraduationGate({ repoRoot });
  const ok = batchV374.ok === true && gate375.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V375_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V375_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate375Mode: skipPrior ? "evidence-trend" : "post375-graduation",
    batchV374,
    gate375,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV375Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
