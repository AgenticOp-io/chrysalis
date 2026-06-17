#!/usr/bin/env node
/** Full-stack authoring batch v181 (G3109): v180 + Post-108 hub ops mega replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV180Smoke } from "./hub-cwl-authoring-batch-v180-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost181GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V181_KIND = "chrysalis.hub.cwl-authoring-batch-v181";
export const HUB_CWL_AUTHORING_BATCH_V181_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV181Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV180 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV180Smoke(resolvePriorBatchOpts(opts, 180));
  const gate181 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost181GraduationGate({ repoRoot });
  const ok = batchV180.ok === true && gate181.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V181_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V181_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate181Mode: skipPrior ? "evidence-trend" : "post181-graduation",
    batchV180,
    gate181,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV181Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
