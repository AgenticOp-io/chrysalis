#!/usr/bin/env node
/** Full-stack authoring batch v233 (G3629): v232 + Post-78 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV232Smoke } from "./hub-cwl-authoring-batch-v232-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost233GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V233_KIND = "chrysalis.hub.cwl-authoring-batch-v233";
export const HUB_CWL_AUTHORING_BATCH_V233_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV233Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV232 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV232Smoke(resolvePriorBatchOpts(opts, 232));
  const gate233 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost233GraduationGate({ repoRoot });
  const ok = batchV232.ok === true && gate233.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V233_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V233_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate233Mode: skipPrior ? "evidence-trend" : "post233-graduation",
    batchV232,
    gate233,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV233Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
