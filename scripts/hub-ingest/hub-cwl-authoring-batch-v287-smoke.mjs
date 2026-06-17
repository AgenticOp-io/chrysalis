#!/usr/bin/env node
/** Full-stack authoring batch v287 (G4169): v286 + Post-78/79 deep export + HTML interp replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV286Smoke } from "./hub-cwl-authoring-batch-v286-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost287GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V287_KIND = "chrysalis.hub.cwl-authoring-batch-v287";
export const HUB_CWL_AUTHORING_BATCH_V287_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV287Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV286 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV286Smoke(resolvePriorBatchOpts(opts, 286));
  const gate287 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost287GraduationGate({ repoRoot });
  const ok = batchV286.ok === true && gate287.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V287_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V287_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate287Mode: skipPrior ? "evidence-trend" : "post287-graduation",
    batchV286,
    gate287,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV287Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
