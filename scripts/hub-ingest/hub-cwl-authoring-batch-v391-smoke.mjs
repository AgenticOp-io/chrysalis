#!/usr/bin/env node
/** Full-stack authoring batch v391 (G5209): v390 + Post-103 evidence trend replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV390Smoke } from "./hub-cwl-authoring-batch-v390-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost391GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V391_KIND = "chrysalis.hub.cwl-authoring-batch-v391";
export const HUB_CWL_AUTHORING_BATCH_V391_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV391Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV390 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV390Smoke(resolvePriorBatchOpts(opts, 390));
  const gate391 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost391GraduationGate({ repoRoot });
  const ok = batchV390.ok === true && gate391.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V391_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V391_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate391Mode: skipPrior ? "evidence-trend" : "post391-graduation",
    batchV390,
    gate391,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV391Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
