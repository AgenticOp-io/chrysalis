#!/usr/bin/env node
/** Full-stack authoring batch v175 (G3049): v174 + Post-102 emit probe replay (Phase E lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV174Smoke } from "./hub-cwl-authoring-batch-v174-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost175GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V175_KIND = "chrysalis.hub.cwl-authoring-batch-v175";
export const HUB_CWL_AUTHORING_BATCH_V175_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV175Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV174 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV174Smoke(resolvePriorBatchOpts(opts, 174));
  const gate175 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost175GraduationGate({ repoRoot });
  const ok = batchV174.ok === true && gate175.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V175_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V175_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate175Mode: skipPrior ? "evidence-trend" : "post175-graduation",
    batchV174,
    gate175,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV175Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
