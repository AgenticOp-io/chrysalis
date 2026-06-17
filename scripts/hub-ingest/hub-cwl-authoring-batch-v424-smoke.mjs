#!/usr/bin/env node
/** Full-stack authoring batch v424 (G5539): v423 + Post-138 preview dev + post-60 replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV423Smoke } from "./hub-cwl-authoring-batch-v423-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost424GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V424_KIND = "chrysalis.hub.cwl-authoring-batch-v424";
export const HUB_CWL_AUTHORING_BATCH_V424_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV424Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV423 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV423Smoke(resolvePriorBatchOpts(opts, 423));
  const gate424 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost424GraduationGate({ repoRoot });
  const ok = batchV423.ok === true && gate424.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V424_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V424_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate424Mode: skipPrior ? "evidence-trend" : "post424-graduation",
    batchV423,
    gate424,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV424Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
