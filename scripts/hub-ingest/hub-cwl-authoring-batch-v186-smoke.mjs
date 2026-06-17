#!/usr/bin/env node
/** Full-stack authoring batch v186 (G3159): v185 + Post-114 Fastify search + runtime parity replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV185Smoke } from "./hub-cwl-authoring-batch-v185-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost186GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V186_KIND = "chrysalis.hub.cwl-authoring-batch-v186";
export const HUB_CWL_AUTHORING_BATCH_V186_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV186Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV185 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV185Smoke(resolvePriorBatchOpts(opts, 185));
  const gate186 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost186GraduationGate({ repoRoot });
  const ok = batchV185.ok === true && gate186.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V186_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V186_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate186Mode: skipPrior ? "evidence-trend" : "post186-graduation",
    batchV185,
    gate186,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV186Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
