#!/usr/bin/env node
/** Full-stack authoring batch v374 (G5039): v373 + Post-76 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV373Smoke } from "./hub-cwl-authoring-batch-v373-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost374GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V374_KIND = "chrysalis.hub.cwl-authoring-batch-v374";
export const HUB_CWL_AUTHORING_BATCH_V374_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV374Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV373 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV373Smoke(resolvePriorBatchOpts(opts, 373));
  const gate374 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost374GraduationGate({ repoRoot });
  const ok = batchV373.ok === true && gate374.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V374_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V374_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate374Mode: skipPrior ? "evidence-trend" : "post374-graduation",
    batchV373,
    gate374,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV374Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
