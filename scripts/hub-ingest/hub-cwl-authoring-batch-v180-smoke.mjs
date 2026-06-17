#!/usr/bin/env node
/** Full-stack authoring batch v180 (G3099): v179 + Post-107 verify-gaps composite replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV179Smoke } from "./hub-cwl-authoring-batch-v179-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost180GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V180_KIND = "chrysalis.hub.cwl-authoring-batch-v180";
export const HUB_CWL_AUTHORING_BATCH_V180_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV180Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV179 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV179Smoke(resolvePriorBatchOpts(opts, 179));
  const gate180 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost180GraduationGate({ repoRoot });
  const ok = batchV179.ok === true && gate180.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V180_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V180_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate180Mode: skipPrior ? "evidence-trend" : "post180-graduation",
    batchV179,
    gate180,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV180Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
