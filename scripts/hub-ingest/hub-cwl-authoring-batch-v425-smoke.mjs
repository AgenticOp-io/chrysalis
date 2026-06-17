#!/usr/bin/env node
/** Full-stack authoring batch v425 (G5549): v424 + Post-139 runtime CWL parity stack replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV424Smoke } from "./hub-cwl-authoring-batch-v424-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost425GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V425_KIND = "chrysalis.hub.cwl-authoring-batch-v425";
export const HUB_CWL_AUTHORING_BATCH_V425_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV425Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV424 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV424Smoke(resolvePriorBatchOpts(opts, 424));
  const gate425 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost425GraduationGate({ repoRoot });
  const ok = batchV424.ok === true && gate425.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V425_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V425_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate425Mode: skipPrior ? "evidence-trend" : "post425-graduation",
    batchV424,
    gate425,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV425Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
