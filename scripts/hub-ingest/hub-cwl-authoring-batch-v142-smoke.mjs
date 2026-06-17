#!/usr/bin/env node
/** Full-stack authoring batch v142 (G2719): v141 + Post-76/77 dual-origin search export. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV141Smoke } from "./hub-cwl-authoring-batch-v141-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost142GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V142_KIND = "chrysalis.hub.cwl-authoring-batch-v142";
export const HUB_CWL_AUTHORING_BATCH_V142_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV142Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV141 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV141Smoke(resolvePriorBatchOpts(opts, 141));
  const gate142 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost142GraduationGate({ repoRoot });
  const ok = batchV141.ok === true && gate142.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V142_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V142_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate142Mode: skipPrior ? "evidence-trend" : "post142-graduation",
    batchV141,
    gate142,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV142Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
