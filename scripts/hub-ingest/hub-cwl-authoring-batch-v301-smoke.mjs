#!/usr/bin/env node
/** Full-stack authoring batch v301 (G4309): v300 + Post-74 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV300Smoke } from "./hub-cwl-authoring-batch-v300-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost301GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V301_KIND = "chrysalis.hub.cwl-authoring-batch-v301";
export const HUB_CWL_AUTHORING_BATCH_V301_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV301Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV300 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV300Smoke(resolvePriorBatchOpts(opts, 300));
  const gate301 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost301GraduationGate({ repoRoot });
  const ok = batchV300.ok === true && gate301.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V301_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V301_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate301Mode: skipPrior ? "evidence-trend" : "post301-graduation",
    batchV300,
    gate301,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV301Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
