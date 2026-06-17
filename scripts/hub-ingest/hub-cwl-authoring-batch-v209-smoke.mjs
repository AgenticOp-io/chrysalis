#!/usr/bin/env node
/** Full-stack authoring batch v209 (G3389): v208 + Post-60 templates + post-50 stack replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV208Smoke } from "./hub-cwl-authoring-batch-v208-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost209GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V209_KIND = "chrysalis.hub.cwl-authoring-batch-v209";
export const HUB_CWL_AUTHORING_BATCH_V209_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV209Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV208 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV208Smoke(resolvePriorBatchOpts(opts, 208));
  const gate209 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost209GraduationGate({ repoRoot });
  const ok = batchV208.ok === true && gate209.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V209_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V209_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate209Mode: skipPrior ? "evidence-trend" : "post209-graduation",
    batchV208,
    gate209,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV209Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
