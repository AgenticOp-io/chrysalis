#!/usr/bin/env node
/** Full-stack authoring batch v297 (G4269): v296 + Post-70 composite replay depth (Phase J lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV296Smoke } from "./hub-cwl-authoring-batch-v296-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost297GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V297_KIND = "chrysalis.hub.cwl-authoring-batch-v297";
export const HUB_CWL_AUTHORING_BATCH_V297_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV297Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV296 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV296Smoke(resolvePriorBatchOpts(opts, 296));
  const gate297 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost297GraduationGate({ repoRoot });
  const ok = batchV296.ok === true && gate297.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V297_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V297_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate297Mode: skipPrior ? "evidence-trend" : "post297-graduation",
    batchV296,
    gate297,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV297Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
