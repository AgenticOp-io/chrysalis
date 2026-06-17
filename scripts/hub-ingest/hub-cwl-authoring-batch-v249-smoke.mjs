#!/usr/bin/env node
/** Full-stack authoring batch v249 (G3789): v248 + Post-104 migration OS mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV248Smoke } from "./hub-cwl-authoring-batch-v248-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost249GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V249_KIND = "chrysalis.hub.cwl-authoring-batch-v249";
export const HUB_CWL_AUTHORING_BATCH_V249_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV249Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV248 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV248Smoke(resolvePriorBatchOpts(opts, 248));
  const gate249 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost249GraduationGate({ repoRoot });
  const ok = batchV248.ok === true && gate249.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V249_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V249_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate249Mode: skipPrior ? "evidence-trend" : "post249-graduation",
    batchV248,
    gate249,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV249Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
