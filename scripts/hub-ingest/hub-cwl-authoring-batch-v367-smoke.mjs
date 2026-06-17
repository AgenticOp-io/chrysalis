#!/usr/bin/env node
/** Full-stack authoring batch v367 (G4969): v366 + Post-69 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV366Smoke } from "./hub-cwl-authoring-batch-v366-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost367GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V367_KIND = "chrysalis.hub.cwl-authoring-batch-v367";
export const HUB_CWL_AUTHORING_BATCH_V367_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV367Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV366 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV366Smoke(resolvePriorBatchOpts(opts, 366));
  const gate367 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost367GraduationGate({ repoRoot });
  const ok = batchV366.ok === true && gate367.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V367_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V367_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate367Mode: skipPrior ? "evidence-trend" : "post367-graduation",
    batchV366,
    gate367,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV367Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
