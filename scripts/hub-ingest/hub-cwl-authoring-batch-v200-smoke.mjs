#!/usr/bin/env node
/** Full-stack authoring batch v200 (G3299): v199 + Post-128 auth-probe reingest HTTP replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV199Smoke } from "./hub-cwl-authoring-batch-v199-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost200GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V200_KIND = "chrysalis.hub.cwl-authoring-batch-v200";
export const HUB_CWL_AUTHORING_BATCH_V200_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV200Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV199 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV199Smoke(resolvePriorBatchOpts(opts, 199));
  const gate200 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost200GraduationGate({ repoRoot });
  const ok = batchV199.ok === true && gate200.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V200_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V200_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate200Mode: skipPrior ? "evidence-trend" : "post200-graduation",
    batchV199,
    gate200,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV200Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
