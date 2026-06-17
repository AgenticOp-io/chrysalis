#!/usr/bin/env node
/** Full-stack authoring batch v123 (G2529): v122 + Query HTML + load array + layout search. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV122Smoke } from "./hub-cwl-authoring-batch-v122-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost123GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V123_KIND = "chrysalis.hub.cwl-authoring-batch-v123";
export const HUB_CWL_AUTHORING_BATCH_V123_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV123Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV122 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV122Smoke(resolvePriorBatchOpts(opts, 122));
  const gate123 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost123GraduationGate({ repoRoot });
  const ok = batchV122.ok === true && gate123.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V123_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V123_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate123Mode: skipPrior ? "evidence-trend" : "post123-graduation",
    batchV122,
    gate123,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV123Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
