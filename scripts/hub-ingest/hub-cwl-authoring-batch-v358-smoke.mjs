#!/usr/bin/env node
/** Full-stack authoring batch v358 (G4879): v357 + Post-78/79 deep export + HTML interp replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV357Smoke } from "./hub-cwl-authoring-batch-v357-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost358GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V358_KIND = "chrysalis.hub.cwl-authoring-batch-v358";
export const HUB_CWL_AUTHORING_BATCH_V358_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV358Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV357 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV357Smoke(resolvePriorBatchOpts(opts, 357));
  const gate358 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost358GraduationGate({ repoRoot });
  const ok = batchV357.ok === true && gate358.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V358_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V358_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate358Mode: skipPrior ? "evidence-trend" : "post358-graduation",
    batchV357,
    gate358,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV358Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
