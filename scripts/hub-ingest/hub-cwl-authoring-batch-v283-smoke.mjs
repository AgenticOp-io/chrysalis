#!/usr/bin/env node
/** Full-stack authoring batch v283 (G4129): v282 + Post-139 runtime CWL parity stack replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV282Smoke } from "./hub-cwl-authoring-batch-v282-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost283GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V283_KIND = "chrysalis.hub.cwl-authoring-batch-v283";
export const HUB_CWL_AUTHORING_BATCH_V283_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV283Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV282 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV282Smoke(resolvePriorBatchOpts(opts, 282));
  const gate283 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost283GraduationGate({ repoRoot });
  const ok = batchV282.ok === true && gate283.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V283_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V283_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate283Mode: skipPrior ? "evidence-trend" : "post283-graduation",
    batchV282,
    gate283,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV283Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
