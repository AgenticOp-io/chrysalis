#!/usr/bin/env node
/** Full-stack authoring batch v259 (G3889): v258 + Post-115 emit verify mega + session replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV258Smoke } from "./hub-cwl-authoring-batch-v258-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost259GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V259_KIND = "chrysalis.hub.cwl-authoring-batch-v259";
export const HUB_CWL_AUTHORING_BATCH_V259_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV259Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV258 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV258Smoke(resolvePriorBatchOpts(opts, 258));
  const gate259 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost259GraduationGate({ repoRoot });
  const ok = batchV258.ok === true && gate259.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V259_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V259_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate259Mode: skipPrior ? "evidence-trend" : "post259-graduation",
    batchV258,
    gate259,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV259Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
