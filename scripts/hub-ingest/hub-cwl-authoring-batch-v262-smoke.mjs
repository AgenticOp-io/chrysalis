#!/usr/bin/env node
/** Full-stack authoring batch v262 (G3919): v261 + Post-118 verify-gaps action replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV261Smoke } from "./hub-cwl-authoring-batch-v261-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost262GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V262_KIND = "chrysalis.hub.cwl-authoring-batch-v262";
export const HUB_CWL_AUTHORING_BATCH_V262_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV262Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV261 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV261Smoke(resolvePriorBatchOpts(opts, 261));
  const gate262 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost262GraduationGate({ repoRoot });
  const ok = batchV261.ok === true && gate262.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V262_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V262_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate262Mode: skipPrior ? "evidence-trend" : "post262-graduation",
    batchV261,
    gate262,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV262Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
