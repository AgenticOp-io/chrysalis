#!/usr/bin/env node
/** Full-stack authoring batch v110 (G2251): v109 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV109Smoke } from "./hub-cwl-authoring-batch-v109-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost109GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPost90HubGraduationLockGate, runEvidenceTrendStandaloneGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V110_KIND = "chrysalis.hub.cwl-authoring-batch-v110";
export const HUB_CWL_AUTHORING_BATCH_V110_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV110Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV109 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV109Smoke(resolvePriorBatchOpts(opts, 109));
  const fullGraduationLock = process.env.CHRYSALIS_RUN_FULL_GRADUATION_LOCK === "1";
  const gate110 = skipPrior
    ? fullGraduationLock
      ? await runPost90HubGraduationLockGate()
      : await runEvidenceTrendStandaloneGate()
    : await runPost109GraduationGate({ repoRoot });
  const ok = batchV109.ok === true && gate110.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V110_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V110_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate110Mode: skipPrior
      ? fullGraduationLock
        ? "post90-hub-graduation-lock"
        : "evidence-trend"
      : "post109-graduation",
    batchV109,
    gate110,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV110Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
