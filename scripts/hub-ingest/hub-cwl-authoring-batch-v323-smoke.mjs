#!/usr/bin/env node
/** Full-stack authoring batch v323 (G4529): v322 + Post-106 verify standalone mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV322Smoke } from "./hub-cwl-authoring-batch-v322-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost323GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V323_KIND = "chrysalis.hub.cwl-authoring-batch-v323";
export const HUB_CWL_AUTHORING_BATCH_V323_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV323Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV322 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV322Smoke(resolvePriorBatchOpts(opts, 322));
  const gate323 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost323GraduationGate({ repoRoot });
  const ok = batchV322.ok === true && gate323.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V323_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V323_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate323Mode: skipPrior ? "evidence-trend" : "post323-graduation",
    batchV322,
    gate323,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV323Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
