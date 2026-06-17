#!/usr/bin/env node
/** Full-stack authoring batch v288 (G4179): v287 + Month-23 graduation + post-89 lock replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV287Smoke } from "./hub-cwl-authoring-batch-v287-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost288GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V288_KIND = "chrysalis.hub.cwl-authoring-batch-v288";
export const HUB_CWL_AUTHORING_BATCH_V288_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV288Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV287 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV287Smoke(resolvePriorBatchOpts(opts, 287));
  const gate288 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost288GraduationGate({ repoRoot });
  const ok = batchV287.ok === true && gate288.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V288_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V288_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate288Mode: skipPrior ? "evidence-trend" : "post288-graduation",
    batchV287,
    gate288,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV288Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
