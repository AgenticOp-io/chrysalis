#!/usr/bin/env node
/** Full-stack authoring batch v274 (G4039): v273 + Post-130 post-90 verify-gaps composite replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV273Smoke } from "./hub-cwl-authoring-batch-v273-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost274GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V274_KIND = "chrysalis.hub.cwl-authoring-batch-v274";
export const HUB_CWL_AUTHORING_BATCH_V274_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV274Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV273 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV273Smoke(resolvePriorBatchOpts(opts, 273));
  const gate274 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost274GraduationGate({ repoRoot });
  const ok = batchV273.ok === true && gate274.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V274_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V274_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate274Mode: skipPrior ? "evidence-trend" : "post274-graduation",
    batchV273,
    gate274,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV274Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
