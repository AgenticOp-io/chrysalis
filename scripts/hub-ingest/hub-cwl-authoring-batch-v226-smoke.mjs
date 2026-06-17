#!/usr/bin/env node
/** Full-stack authoring batch v226 (G3559): v225 + Post-71 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV225Smoke } from "./hub-cwl-authoring-batch-v225-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost226GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V226_KIND = "chrysalis.hub.cwl-authoring-batch-v226";
export const HUB_CWL_AUTHORING_BATCH_V226_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV226Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV225 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV225Smoke(resolvePriorBatchOpts(opts, 225));
  const gate226 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost226GraduationGate({ repoRoot });
  const ok = batchV225.ok === true && gate226.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V226_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V226_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate226Mode: skipPrior ? "evidence-trend" : "post226-graduation",
    batchV225,
    gate226,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV226Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
