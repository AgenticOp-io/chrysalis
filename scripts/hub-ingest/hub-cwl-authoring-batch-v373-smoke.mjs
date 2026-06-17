#!/usr/bin/env node
/** Full-stack authoring batch v373 (G5029): v372 + Post-75 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV372Smoke } from "./hub-cwl-authoring-batch-v372-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost373GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V373_KIND = "chrysalis.hub.cwl-authoring-batch-v373";
export const HUB_CWL_AUTHORING_BATCH_V373_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV373Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV372 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV372Smoke(resolvePriorBatchOpts(opts, 372));
  const gate373 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost373GraduationGate({ repoRoot });
  const ok = batchV372.ok === true && gate373.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V373_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V373_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate373Mode: skipPrior ? "evidence-trend" : "post373-graduation",
    batchV372,
    gate373,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV373Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
