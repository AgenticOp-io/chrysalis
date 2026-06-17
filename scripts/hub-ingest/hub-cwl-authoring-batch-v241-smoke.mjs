#!/usr/bin/env node
/** Full-stack authoring batch v241 (G3709): v240 + Post-86 CWL roundtrip replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV240Smoke } from "./hub-cwl-authoring-batch-v240-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost241GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V241_KIND = "chrysalis.hub.cwl-authoring-batch-v241";
export const HUB_CWL_AUTHORING_BATCH_V241_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV241Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV240 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV240Smoke(resolvePriorBatchOpts(opts, 240));
  const gate241 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost241GraduationGate({ repoRoot });
  const ok = batchV240.ok === true && gate241.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V241_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V241_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate241Mode: skipPrior ? "evidence-trend" : "post241-graduation",
    batchV240,
    gate241,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV241Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
