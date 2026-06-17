#!/usr/bin/env node
/** Full-stack authoring batch v275 (G4049): v274 + Post-131 session + runtime replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV274Smoke } from "./hub-cwl-authoring-batch-v274-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost275GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V275_KIND = "chrysalis.hub.cwl-authoring-batch-v275";
export const HUB_CWL_AUTHORING_BATCH_V275_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV275Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV274 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV274Smoke(resolvePriorBatchOpts(opts, 274));
  const gate275 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost275GraduationGate({ repoRoot });
  const ok = batchV274.ok === true && gate275.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V275_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V275_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate275Mode: skipPrior ? "evidence-trend" : "post275-graduation",
    batchV274,
    gate275,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV275Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
