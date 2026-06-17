#!/usr/bin/env node
/** Full-stack authoring batch v383 (G5129): v382 + Post-85 post-translate express replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV382Smoke } from "./hub-cwl-authoring-batch-v382-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost383GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V383_KIND = "chrysalis.hub.cwl-authoring-batch-v383";
export const HUB_CWL_AUTHORING_BATCH_V383_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV383Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV382 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV382Smoke(resolvePriorBatchOpts(opts, 382));
  const gate383 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost383GraduationGate({ repoRoot });
  const ok = batchV382.ok === true && gate383.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V383_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V383_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate383Mode: skipPrior ? "evidence-trend" : "post383-graduation",
    batchV382,
    gate383,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV383Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
