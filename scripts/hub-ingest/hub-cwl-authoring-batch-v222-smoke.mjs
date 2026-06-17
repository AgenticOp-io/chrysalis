#!/usr/bin/env node
/** Full-stack authoring batch v222 (G3519): v221 + Post-67 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV221Smoke } from "./hub-cwl-authoring-batch-v221-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost222GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V222_KIND = "chrysalis.hub.cwl-authoring-batch-v222";
export const HUB_CWL_AUTHORING_BATCH_V222_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV222Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV221 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV221Smoke(resolvePriorBatchOpts(opts, 221));
  const gate222 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost222GraduationGate({ repoRoot });
  const ok = batchV221.ok === true && gate222.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V222_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V222_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate222Mode: skipPrior ? "evidence-trend" : "post222-graduation",
    batchV221,
    gate222,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV222Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
