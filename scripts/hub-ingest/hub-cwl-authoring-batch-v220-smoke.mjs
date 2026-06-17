#!/usr/bin/env node
/** Full-stack authoring batch v220 (G3499): v219 + Post-65 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV219Smoke } from "./hub-cwl-authoring-batch-v219-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost220GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V220_KIND = "chrysalis.hub.cwl-authoring-batch-v220";
export const HUB_CWL_AUTHORING_BATCH_V220_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV220Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV219 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV219Smoke(resolvePriorBatchOpts(opts, 219));
  const gate220 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost220GraduationGate({ repoRoot });
  const ok = batchV219.ok === true && gate220.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V220_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V220_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate220Mode: skipPrior ? "evidence-trend" : "post220-graduation",
    batchV219,
    gate220,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV220Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
