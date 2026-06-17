#!/usr/bin/env node
/** Full-stack authoring batch v298 (G4279): v297 + Post-71 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV297Smoke } from "./hub-cwl-authoring-batch-v297-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost298GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V298_KIND = "chrysalis.hub.cwl-authoring-batch-v298";
export const HUB_CWL_AUTHORING_BATCH_V298_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV298Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV297 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV297Smoke(resolvePriorBatchOpts(opts, 297));
  const gate298 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost298GraduationGate({ repoRoot });
  const ok = batchV297.ok === true && gate298.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V298_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V298_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate298Mode: skipPrior ? "evidence-trend" : "post298-graduation",
    batchV297,
    gate298,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV298Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
