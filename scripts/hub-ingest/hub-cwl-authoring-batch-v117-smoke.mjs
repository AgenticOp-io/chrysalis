#!/usr/bin/env node
/** Full-stack authoring batch v117 (G2469): v116 + Contract + CWL roundtrip depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV116Smoke } from "./hub-cwl-authoring-batch-v116-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost117GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V117_KIND = "chrysalis.hub.cwl-authoring-batch-v117";
export const HUB_CWL_AUTHORING_BATCH_V117_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV117Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV116 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV116Smoke(resolvePriorBatchOpts(opts, 116));
  const gate117 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost117GraduationGate({ repoRoot });
  const ok = batchV116.ok === true && gate117.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V117_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V117_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate117Mode: skipPrior ? "evidence-trend" : "post117-graduation",
    batchV116,
    gate117,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV117Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
