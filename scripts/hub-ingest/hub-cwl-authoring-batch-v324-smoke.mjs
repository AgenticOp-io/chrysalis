#!/usr/bin/env node
/** Full-stack authoring batch v324 (G4539): v323 + Post-107 verify-gaps composite replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV323Smoke } from "./hub-cwl-authoring-batch-v323-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost324GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V324_KIND = "chrysalis.hub.cwl-authoring-batch-v324";
export const HUB_CWL_AUTHORING_BATCH_V324_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV324Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV323 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV323Smoke(resolvePriorBatchOpts(opts, 323));
  const gate324 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost324GraduationGate({ repoRoot });
  const ok = batchV323.ok === true && gate324.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V324_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V324_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate324Mode: skipPrior ? "evidence-trend" : "post324-graduation",
    batchV323,
    gate324,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV324Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
