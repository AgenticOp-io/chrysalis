#!/usr/bin/env node
/** Full-stack authoring batch v356 (G4859): v355 + Post-141 flagship HTTP express replay (Phase M lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV355Smoke } from "./hub-cwl-authoring-batch-v355-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost356GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V356_KIND = "chrysalis.hub.cwl-authoring-batch-v356";
export const HUB_CWL_AUTHORING_BATCH_V356_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV356Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV355 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV355Smoke(resolvePriorBatchOpts(opts, 355));
  const gate356 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost356GraduationGate({ repoRoot });
  const ok = batchV355.ok === true && gate356.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V356_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V356_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate356Mode: skipPrior ? "evidence-trend" : "post356-graduation",
    batchV355,
    gate356,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV356Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
