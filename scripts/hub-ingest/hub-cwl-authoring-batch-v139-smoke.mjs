#!/usr/bin/env node
/** Full-stack authoring batch v139 (G2689): v138 + Post-62 runtime CWL parity stack. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV138Smoke } from "./hub-cwl-authoring-batch-v138-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost139GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V139_KIND = "chrysalis.hub.cwl-authoring-batch-v139";
export const HUB_CWL_AUTHORING_BATCH_V139_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV139Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV138 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV138Smoke(resolvePriorBatchOpts(opts, 138));
  const gate139 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost139GraduationGate({ repoRoot });
  const ok = batchV138.ok === true && gate139.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V139_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V139_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate139Mode: skipPrior ? "evidence-trend" : "post139-graduation",
    batchV138,
    gate139,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV139Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
