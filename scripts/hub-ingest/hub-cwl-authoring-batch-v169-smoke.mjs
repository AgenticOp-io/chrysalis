#!/usr/bin/env node
/** Full-stack authoring batch v169 (G2989): v168 + Post-86 CWL roundtrip replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV168Smoke } from "./hub-cwl-authoring-batch-v168-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost169GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V169_KIND = "chrysalis.hub.cwl-authoring-batch-v169";
export const HUB_CWL_AUTHORING_BATCH_V169_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV169Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV168 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV168Smoke(resolvePriorBatchOpts(opts, 168));
  const gate169 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost169GraduationGate({ repoRoot });
  const ok = batchV168.ok === true && gate169.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V169_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V169_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate169Mode: skipPrior ? "evidence-trend" : "post169-graduation",
    batchV168,
    gate169,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV169Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
