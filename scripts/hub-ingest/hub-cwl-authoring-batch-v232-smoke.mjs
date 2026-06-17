#!/usr/bin/env node
/** Full-stack authoring batch v232 (G3619): v231 + Post-77 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV231Smoke } from "./hub-cwl-authoring-batch-v231-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost232GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V232_KIND = "chrysalis.hub.cwl-authoring-batch-v232";
export const HUB_CWL_AUTHORING_BATCH_V232_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV232Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV231 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV231Smoke(resolvePriorBatchOpts(opts, 231));
  const gate232 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost232GraduationGate({ repoRoot });
  const ok = batchV231.ok === true && gate232.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V232_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V232_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate232Mode: skipPrior ? "evidence-trend" : "post232-graduation",
    batchV231,
    gate232,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV232Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
