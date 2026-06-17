#!/usr/bin/env node
/** Full-stack authoring batch v204 (G3339): v203 + Post-132 delivery + flagship replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV203Smoke } from "./hub-cwl-authoring-batch-v203-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost204GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V204_KIND = "chrysalis.hub.cwl-authoring-batch-v204";
export const HUB_CWL_AUTHORING_BATCH_V204_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV204Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV203 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV203Smoke(resolvePriorBatchOpts(opts, 203));
  const gate204 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost204GraduationGate({ repoRoot });
  const ok = batchV203.ok === true && gate204.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V204_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V204_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate204Mode: skipPrior ? "evidence-trend" : "post204-graduation",
    batchV203,
    gate204,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV204Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
