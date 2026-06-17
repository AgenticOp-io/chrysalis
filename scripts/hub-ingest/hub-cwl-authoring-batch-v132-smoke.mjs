#!/usr/bin/env node
/** Full-stack authoring batch v132 (G2619): v131 + Delivery interpolation + flagship + gaps ingest. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV131Smoke } from "./hub-cwl-authoring-batch-v131-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost132GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V132_KIND = "chrysalis.hub.cwl-authoring-batch-v132";
export const HUB_CWL_AUTHORING_BATCH_V132_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV132Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV131 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV131Smoke(resolvePriorBatchOpts(opts, 131));
  const gate132 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost132GraduationGate({ repoRoot });
  const ok = batchV131.ok === true && gate132.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V132_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V132_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate132Mode: skipPrior ? "evidence-trend" : "post132-graduation",
    batchV131,
    gate132,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV132Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
