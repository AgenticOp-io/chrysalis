#!/usr/bin/env node
/** Full-stack authoring batch v418 (G5479): v417 + Post-132 delivery + flagship replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV417Smoke } from "./hub-cwl-authoring-batch-v417-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost418GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V418_KIND = "chrysalis.hub.cwl-authoring-batch-v418";
export const HUB_CWL_AUTHORING_BATCH_V418_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV418Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV417 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV417Smoke(resolvePriorBatchOpts(opts, 417));
  const gate418 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost418GraduationGate({ repoRoot });
  const ok = batchV417.ok === true && gate418.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V418_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V418_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate418Mode: skipPrior ? "evidence-trend" : "post418-graduation",
    batchV417,
    gate418,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV418Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
