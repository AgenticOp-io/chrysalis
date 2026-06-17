#!/usr/bin/env node
/** Full-stack authoring batch v350 (G4799): v349 + Post-135 flagship + chimera + delivery replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV349Smoke } from "./hub-cwl-authoring-batch-v349-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost350GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V350_KIND = "chrysalis.hub.cwl-authoring-batch-v350";
export const HUB_CWL_AUTHORING_BATCH_V350_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV350Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV349 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV349Smoke(resolvePriorBatchOpts(opts, 349));
  const gate350 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost350GraduationGate({ repoRoot });
  const ok = batchV349.ok === true && gate350.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V350_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V350_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate350Mode: skipPrior ? "evidence-trend" : "post350-graduation",
    batchV349,
    gate350,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV350Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
