#!/usr/bin/env node
/** Full-stack authoring batch v340 (G4699): v339 + Post-125 Phase C graduation lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV339Smoke } from "./hub-cwl-authoring-batch-v339-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost340GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V340_KIND = "chrysalis.hub.cwl-authoring-batch-v340";
export const HUB_CWL_AUTHORING_BATCH_V340_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV340Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV339 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV339Smoke(resolvePriorBatchOpts(opts, 339));
  const gate340 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost340GraduationGate({ repoRoot });
  const ok = batchV339.ok === true && gate340.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V340_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V340_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate340Mode: skipPrior ? "evidence-trend" : "post340-graduation",
    batchV339,
    gate340,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV340Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
