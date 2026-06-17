#!/usr/bin/env node
/** Full-stack authoring batch v382 (G5119): v381 + Post-84 contract roundtrip replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV381Smoke } from "./hub-cwl-authoring-batch-v381-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost382GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V382_KIND = "chrysalis.hub.cwl-authoring-batch-v382";
export const HUB_CWL_AUTHORING_BATCH_V382_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV382Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV381 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV381Smoke(resolvePriorBatchOpts(opts, 381));
  const gate382 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost382GraduationGate({ repoRoot });
  const ok = batchV381.ok === true && gate382.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V382_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V382_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate382Mode: skipPrior ? "evidence-trend" : "post382-graduation",
    batchV381,
    gate382,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV382Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
