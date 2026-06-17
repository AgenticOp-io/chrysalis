#!/usr/bin/env node
/** Full-stack authoring batch v359 (G4889): v358 + Month-23 graduation + post-89 lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV358Smoke } from "./hub-cwl-authoring-batch-v358-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost359GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V359_KIND = "chrysalis.hub.cwl-authoring-batch-v359";
export const HUB_CWL_AUTHORING_BATCH_V359_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV359Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV358 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV358Smoke(resolvePriorBatchOpts(opts, 358));
  const gate359 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost359GraduationGate({ repoRoot });
  const ok = batchV358.ok === true && gate359.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V359_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V359_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate359Mode: skipPrior ? "evidence-trend" : "post359-graduation",
    batchV358,
    gate359,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV359Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
