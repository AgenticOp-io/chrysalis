#!/usr/bin/env node
/** Full-stack authoring batch v115 (G2449): v114 + emit verify mega + session/diagnose gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV114Smoke } from "./hub-cwl-authoring-batch-v114-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost115GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V115_KIND = "chrysalis.hub.cwl-authoring-batch-v115";
export const HUB_CWL_AUTHORING_BATCH_V115_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV115Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV114 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV114Smoke(resolvePriorBatchOpts(opts, 114));
  const gate115 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost115GraduationGate({ repoRoot });
  const ok = batchV114.ok === true && gate115.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V115_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V115_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate115Mode: skipPrior ? "evidence-trend" : "post115-graduation",
    batchV114,
    gate115,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV115Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
