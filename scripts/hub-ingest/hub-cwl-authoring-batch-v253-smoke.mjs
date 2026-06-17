#!/usr/bin/env node
/** Full-stack authoring batch v253 (G3829): v252 + Post-108 hub ops mega replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV252Smoke } from "./hub-cwl-authoring-batch-v252-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost253GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V253_KIND = "chrysalis.hub.cwl-authoring-batch-v253";
export const HUB_CWL_AUTHORING_BATCH_V253_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV253Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV252 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV252Smoke(resolvePriorBatchOpts(opts, 252));
  const gate253 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost253GraduationGate({ repoRoot });
  const ok = batchV252.ok === true && gate253.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V253_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V253_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate253Mode: skipPrior ? "evidence-trend" : "post253-graduation",
    batchV252,
    gate253,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV253Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
