#!/usr/bin/env node
/** Full-stack authoring batch v65 (G1801): v64 + project-to-CWL mandatory gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV64Smoke } from "./hub-cwl-authoring-batch-v64-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runPost64GraduationGate,
  runProjectToCwlMandatoryGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V65_KIND = "chrysalis.hub.cwl-authoring-batch-v65";
export const HUB_CWL_AUTHORING_BATCH_V65_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV65Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV64 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV64Smoke(resolvePriorBatchOpts(opts, 64));
  const gate65 = skipPrior
    ? await runProjectToCwlMandatoryGate({ repoRoot })
    : await runPost64GraduationGate({ repoRoot });
  const ok = batchV64.ok === true && gate65.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V65_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V65_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate65Mode: skipPrior ? "project-to-cwl-mandatory" : "post64-graduation",
    batchV64,
    gate65,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV65Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
