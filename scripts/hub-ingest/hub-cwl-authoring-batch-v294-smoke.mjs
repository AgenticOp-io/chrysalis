#!/usr/bin/env node
/** Full-stack authoring batch v294 (G4239): v293 + Post-67 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV293Smoke } from "./hub-cwl-authoring-batch-v293-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost294GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V294_KIND = "chrysalis.hub.cwl-authoring-batch-v294";
export const HUB_CWL_AUTHORING_BATCH_V294_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV294Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV293 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV293Smoke(resolvePriorBatchOpts(opts, 293));
  const gate294 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost294GraduationGate({ repoRoot });
  const ok = batchV293.ok === true && gate294.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V294_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V294_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate294Mode: skipPrior ? "evidence-trend" : "post294-graduation",
    batchV293,
    gate294,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV294Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
