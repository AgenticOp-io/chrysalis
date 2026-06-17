#!/usr/bin/env node
/** Full-stack authoring batch v352 (G4819): v351 + Post-137 templates + post-50 stack replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV351Smoke } from "./hub-cwl-authoring-batch-v351-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost352GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V352_KIND = "chrysalis.hub.cwl-authoring-batch-v352";
export const HUB_CWL_AUTHORING_BATCH_V352_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV352Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV351 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV351Smoke(resolvePriorBatchOpts(opts, 351));
  const gate352 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost352GraduationGate({ repoRoot });
  const ok = batchV351.ok === true && gate352.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V352_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V352_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate352Mode: skipPrior ? "evidence-trend" : "post352-graduation",
    batchV351,
    gate352,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV352Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
