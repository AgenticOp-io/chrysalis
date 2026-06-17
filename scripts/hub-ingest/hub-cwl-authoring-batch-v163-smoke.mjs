#!/usr/bin/env node
/** Full-stack authoring batch v163 (G2929): v162 + Post-80 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV162Smoke } from "./hub-cwl-authoring-batch-v162-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost163GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V163_KIND = "chrysalis.hub.cwl-authoring-batch-v163";
export const HUB_CWL_AUTHORING_BATCH_V163_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV163Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV162 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV162Smoke(resolvePriorBatchOpts(opts, 162));
  const gate163 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost163GraduationGate({ repoRoot });
  const ok = batchV162.ok === true && gate163.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V163_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V163_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate163Mode: skipPrior ? "evidence-trend" : "post163-graduation",
    batchV162,
    gate163,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV163Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
