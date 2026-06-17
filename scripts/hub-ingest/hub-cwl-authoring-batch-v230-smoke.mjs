#!/usr/bin/env node
/** Full-stack authoring batch v230 (G3599): v229 + Post-75 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV229Smoke } from "./hub-cwl-authoring-batch-v229-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost230GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V230_KIND = "chrysalis.hub.cwl-authoring-batch-v230";
export const HUB_CWL_AUTHORING_BATCH_V230_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV230Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV229 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV229Smoke(resolvePriorBatchOpts(opts, 229));
  const gate230 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost230GraduationGate({ repoRoot });
  const ok = batchV229.ok === true && gate230.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V230_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V230_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate230Mode: skipPrior ? "evidence-trend" : "post230-graduation",
    batchV229,
    gate230,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV230Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
