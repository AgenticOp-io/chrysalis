#!/usr/bin/env node
/** Full-stack authoring batch v276 (G4059): v275 + Post-132 delivery + flagship replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV275Smoke } from "./hub-cwl-authoring-batch-v275-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost276GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V276_KIND = "chrysalis.hub.cwl-authoring-batch-v276";
export const HUB_CWL_AUTHORING_BATCH_V276_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV276Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV275 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV275Smoke(resolvePriorBatchOpts(opts, 275));
  const gate276 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost276GraduationGate({ repoRoot });
  const ok = batchV275.ok === true && gate276.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V276_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V276_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate276Mode: skipPrior ? "evidence-trend" : "post276-graduation",
    batchV275,
    gate276,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV276Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
