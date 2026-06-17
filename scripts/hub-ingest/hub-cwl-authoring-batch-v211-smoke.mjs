#!/usr/bin/env node
/** Full-stack authoring batch v211 (G3409): v210 + Post-62 runtime CWL parity stack replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV210Smoke } from "./hub-cwl-authoring-batch-v210-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost211GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V211_KIND = "chrysalis.hub.cwl-authoring-batch-v211";
export const HUB_CWL_AUTHORING_BATCH_V211_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV211Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV210 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV210Smoke(resolvePriorBatchOpts(opts, 210));
  const gate211 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost211GraduationGate({ repoRoot });
  const ok = batchV210.ok === true && gate211.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V211_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V211_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate211Mode: skipPrior ? "evidence-trend" : "post211-graduation",
    batchV210,
    gate211,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV211Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
