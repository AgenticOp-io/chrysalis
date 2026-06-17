#!/usr/bin/env node
/** Full-stack authoring batch v291 (G4209): v290 + Post-64 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV290Smoke } from "./hub-cwl-authoring-batch-v290-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost291GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V291_KIND = "chrysalis.hub.cwl-authoring-batch-v291";
export const HUB_CWL_AUTHORING_BATCH_V291_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV291Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV290 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV290Smoke(resolvePriorBatchOpts(opts, 290));
  const gate291 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost291GraduationGate({ repoRoot });
  const ok = batchV290.ok === true && gate291.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V291_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V291_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate291Mode: skipPrior ? "evidence-trend" : "post291-graduation",
    batchV290,
    gate291,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV291Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
