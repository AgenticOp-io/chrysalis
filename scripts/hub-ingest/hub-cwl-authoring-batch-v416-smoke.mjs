#!/usr/bin/env node
/** Full-stack authoring batch v416 (G5459): v415 + Post-130 post-90 verify-gaps composite replay (Phase P lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV415Smoke } from "./hub-cwl-authoring-batch-v415-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost416GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V416_KIND = "chrysalis.hub.cwl-authoring-batch-v416";
export const HUB_CWL_AUTHORING_BATCH_V416_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV416Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV415 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV415Smoke(resolvePriorBatchOpts(opts, 415));
  const gate416 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost416GraduationGate({ repoRoot });
  const ok = batchV415.ok === true && gate416.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V416_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V416_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate416Mode: skipPrior ? "evidence-trend" : "post416-graduation",
    batchV415,
    gate416,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV416Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
