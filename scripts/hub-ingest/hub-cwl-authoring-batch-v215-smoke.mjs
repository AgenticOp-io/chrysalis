#!/usr/bin/env node
/** Full-stack authoring batch v215 (G3449): v214 + Post-78/79 deep export + HTML interp replay (Phase I lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV214Smoke } from "./hub-cwl-authoring-batch-v214-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost215GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V215_KIND = "chrysalis.hub.cwl-authoring-batch-v215";
export const HUB_CWL_AUTHORING_BATCH_V215_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV215Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV214 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV214Smoke(resolvePriorBatchOpts(opts, 214));
  const gate215 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost215GraduationGate({ repoRoot });
  const ok = batchV214.ok === true && gate215.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V215_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V215_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate215Mode: skipPrior ? "evidence-trend" : "post215-graduation",
    batchV214,
    gate215,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV215Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
