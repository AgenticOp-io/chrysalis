#!/usr/bin/env node
/** Full-stack authoring batch v92 (G2071): v91 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV91Smoke } from "./hub-cwl-authoring-batch-v91-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost91GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runVerifyGapsSymfonyFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V92_KIND = "chrysalis.hub.cwl-authoring-batch-v92";
export const HUB_CWL_AUTHORING_BATCH_V92_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV92Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV91 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV91Smoke(resolvePriorBatchOpts(opts, 91));
  const gate92 = skipPrior
    ? await runVerifyGapsSymfonyFlagshipGate()
    : await runPost91GraduationGate({ repoRoot });
  const ok = batchV91.ok === true && gate92.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V92_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V92_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate92Mode: skipPrior ? "verify-gaps-symfony" : "post91-graduation",
    batchV91,
    gate92,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV92Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
