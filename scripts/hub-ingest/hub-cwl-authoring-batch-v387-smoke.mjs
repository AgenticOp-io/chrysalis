#!/usr/bin/env node
/** Full-stack authoring batch v387 (G5169): v386 + Post-89 month-23 lock replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV386Smoke } from "./hub-cwl-authoring-batch-v386-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost387GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V387_KIND = "chrysalis.hub.cwl-authoring-batch-v387";
export const HUB_CWL_AUTHORING_BATCH_V387_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV387Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV386 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV386Smoke(resolvePriorBatchOpts(opts, 386));
  const gate387 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost387GraduationGate({ repoRoot });
  const ok = batchV386.ok === true && gate387.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V387_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V387_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate387Mode: skipPrior ? "evidence-trend" : "post387-graduation",
    batchV386,
    gate387,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV387Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
