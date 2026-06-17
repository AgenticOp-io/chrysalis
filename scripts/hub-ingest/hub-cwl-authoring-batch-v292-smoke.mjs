#!/usr/bin/env node
/** Full-stack authoring batch v292 (G4219): v291 + Post-65 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV291Smoke } from "./hub-cwl-authoring-batch-v291-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost292GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V292_KIND = "chrysalis.hub.cwl-authoring-batch-v292";
export const HUB_CWL_AUTHORING_BATCH_V292_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV292Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV291 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV291Smoke(resolvePriorBatchOpts(opts, 291));
  const gate292 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost292GraduationGate({ repoRoot });
  const ok = batchV291.ok === true && gate292.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V292_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V292_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate292Mode: skipPrior ? "evidence-trend" : "post292-graduation",
    batchV291,
    gate292,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV292Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
