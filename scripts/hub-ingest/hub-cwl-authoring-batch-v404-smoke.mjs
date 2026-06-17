#!/usr/bin/env node
/** Full-stack authoring batch v404 (G5339): v403 + Post-118 verify-gaps action replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV403Smoke } from "./hub-cwl-authoring-batch-v403-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost404GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V404_KIND = "chrysalis.hub.cwl-authoring-batch-v404";
export const HUB_CWL_AUTHORING_BATCH_V404_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV404Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV403 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV403Smoke(resolvePriorBatchOpts(opts, 403));
  const gate404 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost404GraduationGate({ repoRoot });
  const ok = batchV403.ok === true && gate404.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V404_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V404_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate404Mode: skipPrior ? "evidence-trend" : "post404-graduation",
    batchV403,
    gate404,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV404Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
