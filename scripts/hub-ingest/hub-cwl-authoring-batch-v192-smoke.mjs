#!/usr/bin/env node
/** Full-stack authoring batch v192 (G3219): v191 + Post-120 HTTP verify + express oracle replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV191Smoke } from "./hub-cwl-authoring-batch-v191-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost192GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V192_KIND = "chrysalis.hub.cwl-authoring-batch-v192";
export const HUB_CWL_AUTHORING_BATCH_V192_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV192Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV191 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV191Smoke(resolvePriorBatchOpts(opts, 191));
  const gate192 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost192GraduationGate({ repoRoot });
  const ok = batchV191.ok === true && gate192.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V192_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V192_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate192Mode: skipPrior ? "evidence-trend" : "post192-graduation",
    batchV191,
    gate192,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV192Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
