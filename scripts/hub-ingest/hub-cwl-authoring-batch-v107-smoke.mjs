#!/usr/bin/env node
/** Full-stack authoring batch v107 (G2221): v106 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV106Smoke } from "./hub-cwl-authoring-batch-v106-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost106GraduationGate,
  runVerifyStandaloneMegaGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V107_KIND = "chrysalis.hub.cwl-authoring-batch-v107";
export const HUB_CWL_AUTHORING_BATCH_V107_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV107Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV106 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV106Smoke(resolvePriorBatchOpts(opts, 106));
  const runVerifyStandaloneMega = process.env.CHRYSALIS_RUN_VERIFY_STANDALONE_MEGA === "1";
  const gate107 = skipPrior
    ? runVerifyStandaloneMega
      ? await runVerifyStandaloneMegaGate()
      : await runEvidenceTrendStandaloneGate()
    : await runPost106GraduationGate({ repoRoot });
  const ok = batchV106.ok === true && gate107.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V107_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V107_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate107Mode: skipPrior
      ? runVerifyStandaloneMega
        ? "verify-standalone-mega"
        : "evidence-trend"
      : "post106-graduation",
    batchV106,
    gate107,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV107Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
