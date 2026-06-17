#!/usr/bin/env node
/** Full-stack authoring batch v335 (G4649): v334 + Post-120 HTTP verify + express oracle replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV334Smoke } from "./hub-cwl-authoring-batch-v334-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost335GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V335_KIND = "chrysalis.hub.cwl-authoring-batch-v335";
export const HUB_CWL_AUTHORING_BATCH_V335_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV335Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV334 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV334Smoke(resolvePriorBatchOpts(opts, 334));
  const gate335 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost335GraduationGate({ repoRoot });
  const ok = batchV334.ok === true && gate335.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V335_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V335_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate335Mode: skipPrior ? "evidence-trend" : "post335-graduation",
    batchV334,
    gate335,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV335Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
