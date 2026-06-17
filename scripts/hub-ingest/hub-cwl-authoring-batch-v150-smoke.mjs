#!/usr/bin/env node
/** Full-stack authoring batch v150 (G2799): v149 + Post-67 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV149Smoke } from "./hub-cwl-authoring-batch-v149-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost150GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V150_KIND = "chrysalis.hub.cwl-authoring-batch-v150";
export const HUB_CWL_AUTHORING_BATCH_V150_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV150Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV149 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV149Smoke(resolvePriorBatchOpts(opts, 149));
  const gate150 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost150GraduationGate({ repoRoot });
  const ok = batchV149.ok === true && gate150.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V150_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V150_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate150Mode: skipPrior ? "evidence-trend" : "post150-graduation",
    batchV149,
    gate150,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV150Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
