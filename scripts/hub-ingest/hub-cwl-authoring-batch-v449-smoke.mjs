#!/usr/bin/env node
/** Full-stack authoring batch v449 (G5787): v448 + post-449 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV448Smoke } from "./hub-cwl-authoring-batch-v448-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost449GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V449_KIND = "chrysalis.hub.cwl-authoring-batch-v449";
export const HUB_CWL_AUTHORING_BATCH_V449_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV449Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV448 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV448Smoke(resolvePriorBatchOpts(opts, 448));
  const gate449 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost449GraduationGate({ repoRoot });
  const ok = batchV448.ok === true && gate449.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V449_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V449_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate449Mode: skipPrior ? "evidence-trend" : "post449-graduation",
    batchV448,
    gate449,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV449Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
