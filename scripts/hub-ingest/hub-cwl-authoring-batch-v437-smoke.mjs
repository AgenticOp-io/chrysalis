#!/usr/bin/env node
/** Full-stack authoring batch v437 (G5669): v436 + Post-67 composite replay depth (Phase U / full-stack ladder complete) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV436Smoke } from "./hub-cwl-authoring-batch-v436-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost437GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V437_KIND = "chrysalis.hub.cwl-authoring-batch-v437";
export const HUB_CWL_AUTHORING_BATCH_V437_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV437Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV436 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV436Smoke(resolvePriorBatchOpts(opts, 436));
  const gate437 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost437GraduationGate({ repoRoot });
  const ok = batchV436.ok === true && gate437.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V437_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V437_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate437Mode: skipPrior ? "evidence-trend" : "post437-graduation",
    batchV436,
    gate437,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV437Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
