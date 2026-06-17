#!/usr/bin/env node
/** Full-stack authoring batch v399 (G5289): v398 + Post-113 production search replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV398Smoke } from "./hub-cwl-authoring-batch-v398-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost399GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V399_KIND = "chrysalis.hub.cwl-authoring-batch-v399";
export const HUB_CWL_AUTHORING_BATCH_V399_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV399Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV398 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV398Smoke(resolvePriorBatchOpts(opts, 398));
  const gate399 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost399GraduationGate({ repoRoot });
  const ok = batchV398.ok === true && gate399.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V399_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V399_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate399Mode: skipPrior ? "evidence-trend" : "post399-graduation",
    batchV398,
    gate399,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV399Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
