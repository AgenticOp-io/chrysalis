#!/usr/bin/env node
/** Full-stack authoring batch v183 (G3129): v182 + Post-111 Phase C pilot replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV182Smoke } from "./hub-cwl-authoring-batch-v182-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost183GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V183_KIND = "chrysalis.hub.cwl-authoring-batch-v183";
export const HUB_CWL_AUTHORING_BATCH_V183_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV183Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV182 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV182Smoke(resolvePriorBatchOpts(opts, 182));
  const gate183 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost183GraduationGate({ repoRoot });
  const ok = batchV182.ok === true && gate183.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V183_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V183_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate183Mode: skipPrior ? "evidence-trend" : "post183-graduation",
    batchV182,
    gate183,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV183Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
