#!/usr/bin/env node
/** Full-stack authoring batch v114 (G2439): v113 + Fastify search emit + runtime parity gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV113Smoke } from "./hub-cwl-authoring-batch-v113-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost114GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V114_KIND = "chrysalis.hub.cwl-authoring-batch-v114";
export const HUB_CWL_AUTHORING_BATCH_V114_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV114Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV113 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV113Smoke(resolvePriorBatchOpts(opts, 113));
  const gate114 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost114GraduationGate({ repoRoot });
  const ok = batchV113.ok === true && gate114.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V114_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V114_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate114Mode: skipPrior ? "evidence-trend" : "post114-graduation",
    batchV113,
    gate114,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV114Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
