#!/usr/bin/env node
/** Full-stack authoring batch v417 (G5469): v416 + Post-131 session + runtime replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV416Smoke } from "./hub-cwl-authoring-batch-v416-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost417GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V417_KIND = "chrysalis.hub.cwl-authoring-batch-v417";
export const HUB_CWL_AUTHORING_BATCH_V417_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV417Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV416 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV416Smoke(resolvePriorBatchOpts(opts, 416));
  const gate417 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost417GraduationGate({ repoRoot });
  const ok = batchV416.ok === true && gate417.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V417_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V417_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate417Mode: skipPrior ? "evidence-trend" : "post417-graduation",
    batchV416,
    gate417,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV417Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
