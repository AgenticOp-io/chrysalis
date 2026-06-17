#!/usr/bin/env node
/** Full-stack authoring batch v355 (G4849): v354 + Post-140 month-2 mega composite replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV354Smoke } from "./hub-cwl-authoring-batch-v354-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost355GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V355_KIND = "chrysalis.hub.cwl-authoring-batch-v355";
export const HUB_CWL_AUTHORING_BATCH_V355_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV355Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV354 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV354Smoke(resolvePriorBatchOpts(opts, 354));
  const gate355 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost355GraduationGate({ repoRoot });
  const ok = batchV354.ok === true && gate355.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V355_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V355_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate355Mode: skipPrior ? "evidence-trend" : "post355-graduation",
    batchV354,
    gate355,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV355Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
