#!/usr/bin/env node
/** Full-stack authoring batch v365 (G4949): v364 + Post-67 composite replay depth (Phase Q lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV364Smoke } from "./hub-cwl-authoring-batch-v364-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost365GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V365_KIND = "chrysalis.hub.cwl-authoring-batch-v365";
export const HUB_CWL_AUTHORING_BATCH_V365_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV365Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV364 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV364Smoke(resolvePriorBatchOpts(opts, 364));
  const gate365 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost365GraduationGate({ repoRoot });
  const ok = batchV364.ok === true && gate365.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V365_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V365_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate365Mode: skipPrior ? "evidence-trend" : "post365-graduation",
    batchV364,
    gate365,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV365Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
