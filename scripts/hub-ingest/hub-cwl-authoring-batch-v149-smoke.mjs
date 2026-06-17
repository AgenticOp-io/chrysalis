#!/usr/bin/env node
/** Full-stack authoring batch v149 (G2789): v148 + Post-66 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV148Smoke } from "./hub-cwl-authoring-batch-v148-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost149GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V149_KIND = "chrysalis.hub.cwl-authoring-batch-v149";
export const HUB_CWL_AUTHORING_BATCH_V149_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV149Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV148 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV148Smoke(resolvePriorBatchOpts(opts, 148));
  const gate149 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost149GraduationGate({ repoRoot });
  const ok = batchV148.ok === true && gate149.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V149_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V149_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate149Mode: skipPrior ? "evidence-trend" : "post149-graduation",
    batchV148,
    gate149,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV149Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
