#!/usr/bin/env node
/** Full-stack authoring batch v450 (G5797): v449 + post-450 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV449Smoke } from "./hub-cwl-authoring-batch-v449-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost450GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V450_KIND = "chrysalis.hub.cwl-authoring-batch-v450";
export const HUB_CWL_AUTHORING_BATCH_V450_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV450Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV449 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV449Smoke(resolvePriorBatchOpts(opts, 449));
  const gate450 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost450GraduationGate({ repoRoot });
  const ok = batchV449.ok === true && gate450.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V450_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V450_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate450Mode: skipPrior ? "evidence-trend" : "post450-graduation",
    batchV449,
    gate450,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV450Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
