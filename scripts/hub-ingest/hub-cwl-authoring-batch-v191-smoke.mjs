#!/usr/bin/env node
/** Full-stack authoring batch v191 (G3209): v190 + Post-119 gold runtime + parity replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV190Smoke } from "./hub-cwl-authoring-batch-v190-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost191GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V191_KIND = "chrysalis.hub.cwl-authoring-batch-v191";
export const HUB_CWL_AUTHORING_BATCH_V191_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV191Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV190 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV190Smoke(resolvePriorBatchOpts(opts, 190));
  const gate191 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost191GraduationGate({ repoRoot });
  const ok = batchV190.ok === true && gate191.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V191_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V191_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate191Mode: skipPrior ? "evidence-trend" : "post191-graduation",
    batchV190,
    gate191,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV191Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
