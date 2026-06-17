#!/usr/bin/env node
/** Full-stack authoring batch v308 (G4379): v307 + Post-81 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV307Smoke } from "./hub-cwl-authoring-batch-v307-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost308GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V308_KIND = "chrysalis.hub.cwl-authoring-batch-v308";
export const HUB_CWL_AUTHORING_BATCH_V308_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV308Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV307 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV307Smoke(resolvePriorBatchOpts(opts, 307));
  const gate308 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost308GraduationGate({ repoRoot });
  const ok = batchV307.ok === true && gate308.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V308_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V308_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate308Mode: skipPrior ? "evidence-trend" : "post308-graduation",
    batchV307,
    gate308,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV308Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
