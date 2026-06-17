#!/usr/bin/env node
/** Full-stack authoring batch v422 (G5519): v421 + Post-136 runtime + verify-gaps parity replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV421Smoke } from "./hub-cwl-authoring-batch-v421-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost422GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V422_KIND = "chrysalis.hub.cwl-authoring-batch-v422";
export const HUB_CWL_AUTHORING_BATCH_V422_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV422Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV421 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV421Smoke(resolvePriorBatchOpts(opts, 421));
  const gate422 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost422GraduationGate({ repoRoot });
  const ok = batchV421.ok === true && gate422.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V422_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V422_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate422Mode: skipPrior ? "evidence-trend" : "post422-graduation",
    batchV421,
    gate422,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV422Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
