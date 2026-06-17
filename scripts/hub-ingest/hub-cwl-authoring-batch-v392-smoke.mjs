#!/usr/bin/env node
/** Full-stack authoring batch v392 (G5219): v391 + Post-104 migration OS mega replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV391Smoke } from "./hub-cwl-authoring-batch-v391-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost392GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V392_KIND = "chrysalis.hub.cwl-authoring-batch-v392";
export const HUB_CWL_AUTHORING_BATCH_V392_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV392Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV391 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV391Smoke(resolvePriorBatchOpts(opts, 391));
  const gate392 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost392GraduationGate({ repoRoot });
  const ok = batchV391.ok === true && gate392.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V392_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V392_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate392Mode: skipPrior ? "evidence-trend" : "post392-graduation",
    batchV391,
    gate392,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV392Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
