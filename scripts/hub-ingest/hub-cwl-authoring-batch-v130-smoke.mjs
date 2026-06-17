#!/usr/bin/env node
/** Full-stack authoring batch v130 (G2599): v129 + Post-90 verify-gaps composite. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV129Smoke } from "./hub-cwl-authoring-batch-v129-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost130GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V130_KIND = "chrysalis.hub.cwl-authoring-batch-v130";
export const HUB_CWL_AUTHORING_BATCH_V130_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV130Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV129 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV129Smoke(resolvePriorBatchOpts(opts, 129));
  const gate130 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost130GraduationGate({ repoRoot });
  const ok = batchV129.ok === true && gate130.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V130_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V130_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate130Mode: skipPrior ? "evidence-trend" : "post130-graduation",
    batchV129,
    gate130,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV130Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
