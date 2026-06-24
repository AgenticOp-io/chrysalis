#!/usr/bin/env node
/** Full-stack authoring batch v443 (G5727): v442 + post-443 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV442Smoke } from "./hub-cwl-authoring-batch-v442-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost443GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V443_KIND = "chrysalis.hub.cwl-authoring-batch-v443";
export const HUB_CWL_AUTHORING_BATCH_V443_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV443Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV442 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV442Smoke(resolvePriorBatchOpts(opts, 442));
  const gate443 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost443GraduationGate({ repoRoot });
  const ok = batchV442.ok === true && gate443.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V443_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V443_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate443Mode: skipPrior ? "evidence-trend" : "post443-graduation",
    batchV442,
    gate443,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV443Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
