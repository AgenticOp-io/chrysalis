#!/usr/bin/env node
/** Full-stack authoring batch v155 (G2849): v154 + Post-72 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV154Smoke } from "./hub-cwl-authoring-batch-v154-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost155GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V155_KIND = "chrysalis.hub.cwl-authoring-batch-v155";
export const HUB_CWL_AUTHORING_BATCH_V155_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV155Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV154 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV154Smoke(resolvePriorBatchOpts(opts, 154));
  const gate155 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost155GraduationGate({ repoRoot });
  const ok = batchV154.ok === true && gate155.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V155_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V155_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate155Mode: skipPrior ? "evidence-trend" : "post155-graduation",
    batchV154,
    gate155,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV155Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
