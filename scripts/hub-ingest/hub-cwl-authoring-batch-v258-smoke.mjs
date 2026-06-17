#!/usr/bin/env node
/** Full-stack authoring batch v258 (G3879): v257 + Post-114 Fastify search + runtime parity replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV257Smoke } from "./hub-cwl-authoring-batch-v257-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost258GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V258_KIND = "chrysalis.hub.cwl-authoring-batch-v258";
export const HUB_CWL_AUTHORING_BATCH_V258_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV258Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV257 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV257Smoke(resolvePriorBatchOpts(opts, 257));
  const gate258 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost258GraduationGate({ repoRoot });
  const ok = batchV257.ok === true && gate258.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V258_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V258_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate258Mode: skipPrior ? "evidence-trend" : "post258-graduation",
    batchV257,
    gate258,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV258Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
