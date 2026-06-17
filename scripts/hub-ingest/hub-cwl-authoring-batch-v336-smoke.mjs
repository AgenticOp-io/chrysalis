#!/usr/bin/env node
/** Full-stack authoring batch v336 (G4659): v335 + Post-121 CWL preview + OpenAPI replay (Phase L lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV335Smoke } from "./hub-cwl-authoring-batch-v335-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost336GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V336_KIND = "chrysalis.hub.cwl-authoring-batch-v336";
export const HUB_CWL_AUTHORING_BATCH_V336_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV336Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV335 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV335Smoke(resolvePriorBatchOpts(opts, 335));
  const gate336 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost336GraduationGate({ repoRoot });
  const ok = batchV335.ok === true && gate336.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V336_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V336_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate336Mode: skipPrior ? "evidence-trend" : "post336-graduation",
    batchV335,
    gate336,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV336Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
