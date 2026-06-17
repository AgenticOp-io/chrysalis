#!/usr/bin/env node
/** Full-stack authoring batch v202 (G3319): v201 + Post-130 post-90 verify-gaps composite replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV201Smoke } from "./hub-cwl-authoring-batch-v201-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost202GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V202_KIND = "chrysalis.hub.cwl-authoring-batch-v202";
export const HUB_CWL_AUTHORING_BATCH_V202_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV202Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV201 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV201Smoke(resolvePriorBatchOpts(opts, 201));
  const gate202 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost202GraduationGate({ repoRoot });
  const ok = batchV201.ok === true && gate202.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V202_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V202_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate202Mode: skipPrior ? "evidence-trend" : "post202-graduation",
    batchV201,
    gate202,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV202Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
