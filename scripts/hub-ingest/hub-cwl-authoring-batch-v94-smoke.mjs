#!/usr/bin/env node
/** Full-stack authoring batch v94 (G2091): v93 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV93Smoke } from "./hub-cwl-authoring-batch-v93-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost93GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runVerifyGapsIngestStandaloneGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V94_KIND = "chrysalis.hub.cwl-authoring-batch-v94";
export const HUB_CWL_AUTHORING_BATCH_V94_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV94Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV93 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV93Smoke(resolvePriorBatchOpts(opts, 93));
  const gate94 = skipPrior
    ? await runVerifyGapsIngestStandaloneGate()
    : await runPost93GraduationGate({ repoRoot });
  const ok = batchV93.ok === true && gate94.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V94_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V94_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate94Mode: skipPrior ? "verify-gaps-ingest-standalone" : "post93-graduation",
    batchV93,
    gate94,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV94Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
