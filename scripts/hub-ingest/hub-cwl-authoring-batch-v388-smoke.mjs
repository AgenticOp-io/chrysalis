#!/usr/bin/env node
/** Full-stack authoring batch v388 (G5179): v387 + Post-100 session stub replay (Phase K lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV387Smoke } from "./hub-cwl-authoring-batch-v387-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost388GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V388_KIND = "chrysalis.hub.cwl-authoring-batch-v388";
export const HUB_CWL_AUTHORING_BATCH_V388_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV388Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV387 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV387Smoke(resolvePriorBatchOpts(opts, 387));
  const gate388 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost388GraduationGate({ repoRoot });
  const ok = batchV387.ok === true && gate388.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V388_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V388_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate388Mode: skipPrior ? "evidence-trend" : "post388-graduation",
    batchV387,
    gate388,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV388Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
