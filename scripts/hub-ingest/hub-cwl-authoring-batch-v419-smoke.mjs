#!/usr/bin/env node
/** Full-stack authoring batch v419 (G5489): v418 + Post-133 post-60 authoring replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV418Smoke } from "./hub-cwl-authoring-batch-v418-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost419GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V419_KIND = "chrysalis.hub.cwl-authoring-batch-v419";
export const HUB_CWL_AUTHORING_BATCH_V419_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV419Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV418 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV418Smoke(resolvePriorBatchOpts(opts, 418));
  const gate419 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost419GraduationGate({ repoRoot });
  const ok = batchV418.ok === true && gate419.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V419_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V419_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate419Mode: skipPrior ? "evidence-trend" : "post419-graduation",
    batchV418,
    gate419,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV419Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
