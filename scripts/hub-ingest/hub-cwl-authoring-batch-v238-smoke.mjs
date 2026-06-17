#!/usr/bin/env node
/** Full-stack authoring batch v238 (G3679): v237 + Post-83 translate E2E replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV237Smoke } from "./hub-cwl-authoring-batch-v237-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost238GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V238_KIND = "chrysalis.hub.cwl-authoring-batch-v238";
export const HUB_CWL_AUTHORING_BATCH_V238_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV238Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV237 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV237Smoke(resolvePriorBatchOpts(opts, 237));
  const gate238 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost238GraduationGate({ repoRoot });
  const ok = batchV237.ok === true && gate238.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V238_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V238_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate238Mode: skipPrior ? "evidence-trend" : "post238-graduation",
    batchV237,
    gate238,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV238Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
