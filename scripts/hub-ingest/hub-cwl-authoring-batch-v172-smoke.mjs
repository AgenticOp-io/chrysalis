#!/usr/bin/env node
/** Full-stack authoring batch v172 (G3019): v171 + Post-89 month-23 lock replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV171Smoke } from "./hub-cwl-authoring-batch-v171-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost172GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V172_KIND = "chrysalis.hub.cwl-authoring-batch-v172";
export const HUB_CWL_AUTHORING_BATCH_V172_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV172Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV171 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV171Smoke(resolvePriorBatchOpts(opts, 171));
  const gate172 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost172GraduationGate({ repoRoot });
  const ok = batchV171.ok === true && gate172.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V172_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V172_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate172Mode: skipPrior ? "evidence-trend" : "post172-graduation",
    batchV171,
    gate172,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV172Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
