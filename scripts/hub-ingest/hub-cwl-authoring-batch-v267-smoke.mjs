#!/usr/bin/env node
/** Full-stack authoring batch v267 (G3969): v266 + Post-123 query HTML + layout search replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV266Smoke } from "./hub-cwl-authoring-batch-v266-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost267GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V267_KIND = "chrysalis.hub.cwl-authoring-batch-v267";
export const HUB_CWL_AUTHORING_BATCH_V267_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV267Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV266 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV266Smoke(resolvePriorBatchOpts(opts, 266));
  const gate267 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost267GraduationGate({ repoRoot });
  const ok = batchV266.ok === true && gate267.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V267_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V267_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate267Mode: skipPrior ? "evidence-trend" : "post267-graduation",
    batchV266,
    gate267,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV267Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
