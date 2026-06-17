#!/usr/bin/env node
/** Full-stack authoring batch v205 (G3349): v204 + Post-133 post-60 authoring replay (Phase H lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV204Smoke } from "./hub-cwl-authoring-batch-v204-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost205GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V205_KIND = "chrysalis.hub.cwl-authoring-batch-v205";
export const HUB_CWL_AUTHORING_BATCH_V205_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV205Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV204 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV204Smoke(resolvePriorBatchOpts(opts, 204));
  const gate205 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost205GraduationGate({ repoRoot });
  const ok = batchV204.ok === true && gate205.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V205_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V205_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate205Mode: skipPrior ? "evidence-trend" : "post205-graduation",
    batchV204,
    gate205,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV205Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
