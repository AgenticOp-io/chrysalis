#!/usr/bin/env node
/** Full-stack authoring batch v362 (G4919): v361 + Post-64 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV361Smoke } from "./hub-cwl-authoring-batch-v361-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost362GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V362_KIND = "chrysalis.hub.cwl-authoring-batch-v362";
export const HUB_CWL_AUTHORING_BATCH_V362_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV362Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV361 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV361Smoke(resolvePriorBatchOpts(opts, 361));
  const gate362 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost362GraduationGate({ repoRoot });
  const ok = batchV361.ok === true && gate362.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V362_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V362_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate362Mode: skipPrior ? "evidence-trend" : "post362-graduation",
    batchV361,
    gate362,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV362Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
