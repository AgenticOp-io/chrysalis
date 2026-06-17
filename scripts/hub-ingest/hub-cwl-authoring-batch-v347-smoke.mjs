#!/usr/bin/env node
/** Full-stack authoring batch v347 (G4769): v346 + Post-132 delivery + flagship replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV346Smoke } from "./hub-cwl-authoring-batch-v346-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost347GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V347_KIND = "chrysalis.hub.cwl-authoring-batch-v347";
export const HUB_CWL_AUTHORING_BATCH_V347_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV347Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV346 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV346Smoke(resolvePriorBatchOpts(opts, 346));
  const gate347 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost347GraduationGate({ repoRoot });
  const ok = batchV346.ok === true && gate347.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V347_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V347_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate347Mode: skipPrior ? "evidence-trend" : "post347-graduation",
    batchV346,
    gate347,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV347Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
