#!/usr/bin/env node
/** Full-stack authoring batch v337 (G4669): v336 + Post-122 diagnose + scope + formatter replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV336Smoke } from "./hub-cwl-authoring-batch-v336-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost337GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V337_KIND = "chrysalis.hub.cwl-authoring-batch-v337";
export const HUB_CWL_AUTHORING_BATCH_V337_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV337Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV336 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV336Smoke(resolvePriorBatchOpts(opts, 336));
  const gate337 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost337GraduationGate({ repoRoot });
  const ok = batchV336.ok === true && gate337.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V337_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V337_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate337Mode: skipPrior ? "evidence-trend" : "post337-graduation",
    batchV336,
    gate337,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV337Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
