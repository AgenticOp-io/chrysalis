#!/usr/bin/env node
/** Full-stack authoring batch v104 (G2191): v103 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV103Smoke } from "./hub-cwl-authoring-batch-v103-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost103GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runEvidenceTrendStandaloneGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V104_KIND = "chrysalis.hub.cwl-authoring-batch-v104";
export const HUB_CWL_AUTHORING_BATCH_V104_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV104Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV103 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV103Smoke(resolvePriorBatchOpts(opts, 103));
  const gate104 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost103GraduationGate({ repoRoot });
  const ok = batchV103.ok === true && gate104.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V104_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V104_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate104Mode: skipPrior ? "evidence-trend" : "post103-graduation",
    batchV103,
    gate104,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV104Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
