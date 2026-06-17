#!/usr/bin/env node
/** Full-stack authoring batch v307 (G4369): v306 + Post-80 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV306Smoke } from "./hub-cwl-authoring-batch-v306-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost307GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V307_KIND = "chrysalis.hub.cwl-authoring-batch-v307";
export const HUB_CWL_AUTHORING_BATCH_V307_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV307Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV306 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV306Smoke(resolvePriorBatchOpts(opts, 306));
  const gate307 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost307GraduationGate({ repoRoot });
  const ok = batchV306.ok === true && gate307.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V307_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V307_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate307Mode: skipPrior ? "evidence-trend" : "post307-graduation",
    batchV306,
    gate307,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV307Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
