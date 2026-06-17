#!/usr/bin/env node
/** Full-stack authoring batch v128 (G2579): v127 + Laravel auth-probe reingest HTTP dual-backend. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV127Smoke } from "./hub-cwl-authoring-batch-v127-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost128GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V128_KIND = "chrysalis.hub.cwl-authoring-batch-v128";
export const HUB_CWL_AUTHORING_BATCH_V128_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV128Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV127 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV127Smoke(resolvePriorBatchOpts(opts, 127));
  const gate128 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost128GraduationGate({ repoRoot });
  const ok = batchV127.ok === true && gate128.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V128_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V128_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate128Mode: skipPrior ? "evidence-trend" : "post128-graduation",
    batchV127,
    gate128,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV128Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
