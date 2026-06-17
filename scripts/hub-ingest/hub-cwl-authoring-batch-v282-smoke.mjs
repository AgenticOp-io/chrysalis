#!/usr/bin/env node
/** Full-stack authoring batch v282 (G4119): v281 + Post-138 preview dev + post-60 replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV281Smoke } from "./hub-cwl-authoring-batch-v281-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost282GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V282_KIND = "chrysalis.hub.cwl-authoring-batch-v282";
export const HUB_CWL_AUTHORING_BATCH_V282_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV282Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV281 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV281Smoke(resolvePriorBatchOpts(opts, 281));
  const gate282 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost282GraduationGate({ repoRoot });
  const ok = batchV281.ok === true && gate282.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V282_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V282_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate282Mode: skipPrior ? "evidence-trend" : "post282-graduation",
    batchV281,
    gate282,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV282Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
