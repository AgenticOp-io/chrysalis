#!/usr/bin/env node
/** Full-stack authoring batch v414 (G5439): v413 + Post-128 auth-probe reingest HTTP replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV413Smoke } from "./hub-cwl-authoring-batch-v413-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost414GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V414_KIND = "chrysalis.hub.cwl-authoring-batch-v414";
export const HUB_CWL_AUTHORING_BATCH_V414_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV414Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV413 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV413Smoke(resolvePriorBatchOpts(opts, 413));
  const gate414 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost414GraduationGate({ repoRoot });
  const ok = batchV413.ok === true && gate414.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V414_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V414_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate414Mode: skipPrior ? "evidence-trend" : "post414-graduation",
    batchV413,
    gate414,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV414Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
