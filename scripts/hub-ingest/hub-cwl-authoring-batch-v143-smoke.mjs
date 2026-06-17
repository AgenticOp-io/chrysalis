#!/usr/bin/env node
/** Full-stack authoring batch v143 (G2729): v142 + Post-78/79 deep export + HTML interp. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV142Smoke } from "./hub-cwl-authoring-batch-v142-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost143GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V143_KIND = "chrysalis.hub.cwl-authoring-batch-v143";
export const HUB_CWL_AUTHORING_BATCH_V143_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV143Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV142 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV142Smoke(resolvePriorBatchOpts(opts, 142));
  const gate143 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost143GraduationGate({ repoRoot });
  const ok = batchV142.ok === true && gate143.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V143_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V143_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate143Mode: skipPrior ? "evidence-trend" : "post143-graduation",
    batchV142,
    gate143,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV143Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
