#!/usr/bin/env node
/** Full-stack authoring batch v91 (G2061): v90 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV90Smoke } from "./hub-cwl-authoring-batch-v90-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost90GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runVerifyGapsExpressFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V91_KIND = "chrysalis.hub.cwl-authoring-batch-v91";
export const HUB_CWL_AUTHORING_BATCH_V91_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV91Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV90 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV90Smoke(resolvePriorBatchOpts(opts, 90));
  const gate91 = skipPrior
    ? await runVerifyGapsExpressFlagshipGate()
    : await runPost90GraduationGate({ repoRoot });
  const ok = batchV90.ok === true && gate91.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V91_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V91_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate91Mode: skipPrior ? "verify-gaps-express" : "post90-graduation",
    batchV90,
    gate91,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV91Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
