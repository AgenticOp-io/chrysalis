#!/usr/bin/env node
/** Full-stack authoring batch v146 (G2759): v145 + Post-63 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV145Smoke } from "./hub-cwl-authoring-batch-v145-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost146GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V146_KIND = "chrysalis.hub.cwl-authoring-batch-v146";
export const HUB_CWL_AUTHORING_BATCH_V146_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV146Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV145 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV145Smoke(resolvePriorBatchOpts(opts, 145));
  const gate146 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost146GraduationGate({ repoRoot });
  const ok = batchV145.ok === true && gate146.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V146_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V146_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate146Mode: skipPrior ? "evidence-trend" : "post146-graduation",
    batchV145,
    gate146,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV146Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
