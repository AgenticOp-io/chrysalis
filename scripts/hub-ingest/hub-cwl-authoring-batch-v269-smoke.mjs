#!/usr/bin/env node
/** Full-stack authoring batch v269 (G3989): v268 + Post-125 Phase C graduation lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV268Smoke } from "./hub-cwl-authoring-batch-v268-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost269GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V269_KIND = "chrysalis.hub.cwl-authoring-batch-v269";
export const HUB_CWL_AUTHORING_BATCH_V269_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV269Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV268 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV268Smoke(resolvePriorBatchOpts(opts, 268));
  const gate269 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost269GraduationGate({ repoRoot });
  const ok = batchV268.ok === true && gate269.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V269_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V269_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate269Mode: skipPrior ? "evidence-trend" : "post269-graduation",
    batchV268,
    gate269,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV269Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
