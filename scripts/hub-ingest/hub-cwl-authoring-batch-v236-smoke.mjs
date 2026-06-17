#!/usr/bin/env node
/** Full-stack authoring batch v236 (G3659): v235 + Post-81 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV235Smoke } from "./hub-cwl-authoring-batch-v235-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost236GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V236_KIND = "chrysalis.hub.cwl-authoring-batch-v236";
export const HUB_CWL_AUTHORING_BATCH_V236_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV236Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV235 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV235Smoke(resolvePriorBatchOpts(opts, 235));
  const gate236 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost236GraduationGate({ repoRoot });
  const ok = batchV235.ok === true && gate236.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V236_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V236_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate236Mode: skipPrior ? "evidence-trend" : "post236-graduation",
    batchV235,
    gate236,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV236Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
