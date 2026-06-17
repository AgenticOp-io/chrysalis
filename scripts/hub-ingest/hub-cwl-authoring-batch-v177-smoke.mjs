#!/usr/bin/env node
/** Full-stack authoring batch v177 (G3069): v176 + Post-104 migration OS mega replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV176Smoke } from "./hub-cwl-authoring-batch-v176-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost177GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V177_KIND = "chrysalis.hub.cwl-authoring-batch-v177";
export const HUB_CWL_AUTHORING_BATCH_V177_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV177Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV176 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV176Smoke(resolvePriorBatchOpts(opts, 176));
  const gate177 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost177GraduationGate({ repoRoot });
  const ok = batchV176.ok === true && gate177.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V177_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V177_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate177Mode: skipPrior ? "evidence-trend" : "post177-graduation",
    batchV176,
    gate177,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV177Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
