#!/usr/bin/env node
/** Full-stack authoring batch v244 (G3739): v243 + Post-89 month-23 lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV243Smoke } from "./hub-cwl-authoring-batch-v243-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost244GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V244_KIND = "chrysalis.hub.cwl-authoring-batch-v244";
export const HUB_CWL_AUTHORING_BATCH_V244_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV244Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV243 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV243Smoke(resolvePriorBatchOpts(opts, 243));
  const gate244 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost244GraduationGate({ repoRoot });
  const ok = batchV243.ok === true && gate244.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V244_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V244_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate244Mode: skipPrior ? "evidence-trend" : "post244-graduation",
    batchV243,
    gate244,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV244Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
