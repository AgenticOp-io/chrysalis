#!/usr/bin/env node
/** Full-stack authoring batch v390 (G5199): v389 + Post-102 emit probe replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV389Smoke } from "./hub-cwl-authoring-batch-v389-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost390GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V390_KIND = "chrysalis.hub.cwl-authoring-batch-v390";
export const HUB_CWL_AUTHORING_BATCH_V390_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV390Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV389 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV389Smoke(resolvePriorBatchOpts(opts, 389));
  const gate390 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost390GraduationGate({ repoRoot });
  const ok = batchV389.ok === true && gate390.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V390_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V390_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate390Mode: skipPrior ? "evidence-trend" : "post390-graduation",
    batchV389,
    gate390,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV390Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
