#!/usr/bin/env node
/** Full-stack authoring batch v432 (G5619): v431 + Post-63 composite replay depth replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV431Smoke } from "./hub-cwl-authoring-batch-v431-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost432GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V432_KIND = "chrysalis.hub.cwl-authoring-batch-v432";
export const HUB_CWL_AUTHORING_BATCH_V432_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV432Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV431 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV431Smoke(resolvePriorBatchOpts(opts, 431));
  const gate432 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost432GraduationGate({ repoRoot });
  const ok = batchV431.ok === true && gate432.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V432_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V432_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate432Mode: skipPrior ? "evidence-trend" : "post432-graduation",
    batchV431,
    gate432,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV432Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
