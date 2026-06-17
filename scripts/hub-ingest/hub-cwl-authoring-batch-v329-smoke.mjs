#!/usr/bin/env node
/** Full-stack authoring batch v329 (G4589): v328 + Post-114 Fastify search + runtime parity replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV328Smoke } from "./hub-cwl-authoring-batch-v328-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost329GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V329_KIND = "chrysalis.hub.cwl-authoring-batch-v329";
export const HUB_CWL_AUTHORING_BATCH_V329_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV329Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV328 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV328Smoke(resolvePriorBatchOpts(opts, 328));
  const gate329 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost329GraduationGate({ repoRoot });
  const ok = batchV328.ok === true && gate329.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V329_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V329_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate329Mode: skipPrior ? "evidence-trend" : "post329-graduation",
    batchV328,
    gate329,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV329Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
