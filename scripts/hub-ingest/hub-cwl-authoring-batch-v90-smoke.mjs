#!/usr/bin/env node
/** Full-stack authoring batch v90 (G2051): v89 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV89Smoke } from "./hub-cwl-authoring-batch-v89-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost89GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runMonth23GraduationLockGate, runEvidenceTrendStandaloneGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V90_KIND = "chrysalis.hub.cwl-authoring-batch-v90";
export const HUB_CWL_AUTHORING_BATCH_V90_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV90Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV89 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV89Smoke(resolvePriorBatchOpts(opts, 89));
  const gate90 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost89GraduationGate({ repoRoot });
  const ok = batchV89.ok === true && gate90.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V90_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V90_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate90Mode: skipPrior ? "evidence-trend" : "post89-graduation",
    batchV89,
    gate90,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV90Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
