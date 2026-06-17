#!/usr/bin/env node
/** Full-stack authoring batch v194 (G3239): v193 + Post-122 diagnose + scope + formatter replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV193Smoke } from "./hub-cwl-authoring-batch-v193-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost194GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V194_KIND = "chrysalis.hub.cwl-authoring-batch-v194";
export const HUB_CWL_AUTHORING_BATCH_V194_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV194Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV193 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV193Smoke(resolvePriorBatchOpts(opts, 193));
  const gate194 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost194GraduationGate({ repoRoot });
  const ok = batchV193.ok === true && gate194.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V194_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V194_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate194Mode: skipPrior ? "evidence-trend" : "post194-graduation",
    batchV193,
    gate194,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV194Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
