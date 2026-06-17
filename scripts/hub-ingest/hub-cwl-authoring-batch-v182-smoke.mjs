#!/usr/bin/env node
/** Full-stack authoring batch v182 (G3119): v181 + Post-109 hub graduation lock replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV181Smoke } from "./hub-cwl-authoring-batch-v181-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost182GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V182_KIND = "chrysalis.hub.cwl-authoring-batch-v182";
export const HUB_CWL_AUTHORING_BATCH_V182_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV182Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV181 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV181Smoke(resolvePriorBatchOpts(opts, 181));
  const gate182 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost182GraduationGate({ repoRoot });
  const ok = batchV181.ok === true && gate182.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V182_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V182_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate182Mode: skipPrior ? "evidence-trend" : "post182-graduation",
    batchV181,
    gate182,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV182Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
