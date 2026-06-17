#!/usr/bin/env node
/** Full-stack authoring batch v260 (G3899): v259 + Post-116 verify-gaps + chimera + translate replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV259Smoke } from "./hub-cwl-authoring-batch-v259-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost260GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V260_KIND = "chrysalis.hub.cwl-authoring-batch-v260";
export const HUB_CWL_AUTHORING_BATCH_V260_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV260Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV259 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV259Smoke(resolvePriorBatchOpts(opts, 259));
  const gate260 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost260GraduationGate({ repoRoot });
  const ok = batchV259.ok === true && gate260.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V260_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V260_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate260Mode: skipPrior ? "evidence-trend" : "post260-graduation",
    batchV259,
    gate260,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV260Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
