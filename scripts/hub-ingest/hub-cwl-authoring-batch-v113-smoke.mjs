#!/usr/bin/env node
/** Full-stack authoring batch v113 (G2429): v112 + production search + CWL export depth gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV112Smoke } from "./hub-cwl-authoring-batch-v112-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost113GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V113_KIND = "chrysalis.hub.cwl-authoring-batch-v113";
export const HUB_CWL_AUTHORING_BATCH_V113_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV113Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV112 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV112Smoke(resolvePriorBatchOpts(opts, 112));
  const gate113 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost113GraduationGate({ repoRoot });
  const ok = batchV112.ok === true && gate113.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V113_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V113_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate113Mode: skipPrior ? "evidence-trend" : "post113-graduation",
    batchV112,
    gate113,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV113Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
