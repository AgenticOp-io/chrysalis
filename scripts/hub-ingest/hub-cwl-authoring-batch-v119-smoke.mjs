#!/usr/bin/env node
/** Full-stack authoring batch v119 (G2489): v118 + Gold runtime + page-load + CWL parity. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV118Smoke } from "./hub-cwl-authoring-batch-v118-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost119GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V119_KIND = "chrysalis.hub.cwl-authoring-batch-v119";
export const HUB_CWL_AUTHORING_BATCH_V119_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV119Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV118 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV118Smoke(resolvePriorBatchOpts(opts, 118));
  const gate119 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost119GraduationGate({ repoRoot });
  const ok = batchV118.ok === true && gate119.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V119_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V119_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate119Mode: skipPrior ? "evidence-trend" : "post119-graduation",
    batchV118,
    gate119,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV119Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
