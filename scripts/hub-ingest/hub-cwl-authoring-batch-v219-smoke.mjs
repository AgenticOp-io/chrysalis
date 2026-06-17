#!/usr/bin/env node
/** Full-stack authoring batch v219 (G3489): v218 + Post-64 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV218Smoke } from "./hub-cwl-authoring-batch-v218-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost219GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V219_KIND = "chrysalis.hub.cwl-authoring-batch-v219";
export const HUB_CWL_AUTHORING_BATCH_V219_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV219Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV218 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV218Smoke(resolvePriorBatchOpts(opts, 218));
  const gate219 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost219GraduationGate({ repoRoot });
  const ok = batchV218.ok === true && gate219.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V219_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V219_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate219Mode: skipPrior ? "evidence-trend" : "post219-graduation",
    batchV218,
    gate219,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV219Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
