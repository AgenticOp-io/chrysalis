#!/usr/bin/env node
/** Full-stack authoring batch v122 (G2519): v121 + Diagnose + scope RFC + formatter lint. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV121Smoke } from "./hub-cwl-authoring-batch-v121-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost122GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V122_KIND = "chrysalis.hub.cwl-authoring-batch-v122";
export const HUB_CWL_AUTHORING_BATCH_V122_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV122Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV121 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV121Smoke(resolvePriorBatchOpts(opts, 121));
  const gate122 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost122GraduationGate({ repoRoot });
  const ok = batchV121.ok === true && gate122.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V122_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V122_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate122Mode: skipPrior ? "evidence-trend" : "post122-graduation",
    batchV121,
    gate122,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV122Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
