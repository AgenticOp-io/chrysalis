#!/usr/bin/env node
/** Full-stack authoring batch v196 (G3259): v195 + Post-124 bootstrap + production graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV195Smoke } from "./hub-cwl-authoring-batch-v195-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost196GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V196_KIND = "chrysalis.hub.cwl-authoring-batch-v196";
export const HUB_CWL_AUTHORING_BATCH_V196_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV196Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV195 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV195Smoke(resolvePriorBatchOpts(opts, 195));
  const gate196 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost196GraduationGate({ repoRoot });
  const ok = batchV195.ok === true && gate196.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V196_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V196_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate196Mode: skipPrior ? "evidence-trend" : "post196-graduation",
    batchV195,
    gate196,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV196Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
