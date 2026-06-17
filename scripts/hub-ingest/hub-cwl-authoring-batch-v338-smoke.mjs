#!/usr/bin/env node
/** Full-stack authoring batch v338 (G4679): v337 + Post-123 query HTML + layout search replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV337Smoke } from "./hub-cwl-authoring-batch-v337-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost338GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V338_KIND = "chrysalis.hub.cwl-authoring-batch-v338";
export const HUB_CWL_AUTHORING_BATCH_V338_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV338Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV337 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV337Smoke(resolvePriorBatchOpts(opts, 337));
  const gate338 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost338GraduationGate({ repoRoot });
  const ok = batchV337.ok === true && gate338.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V338_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V338_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate338Mode: skipPrior ? "evidence-trend" : "post338-graduation",
    batchV337,
    gate338,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV338Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
