#!/usr/bin/env node
/** Full-stack authoring batch v152 (G2819): v151 + Post-69 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV151Smoke } from "./hub-cwl-authoring-batch-v151-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost152GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V152_KIND = "chrysalis.hub.cwl-authoring-batch-v152";
export const HUB_CWL_AUTHORING_BATCH_V152_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV152Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV151 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV151Smoke(resolvePriorBatchOpts(opts, 151));
  const gate152 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost152GraduationGate({ repoRoot });
  const ok = batchV151.ok === true && gate152.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V152_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V152_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate152Mode: skipPrior ? "evidence-trend" : "post152-graduation",
    batchV151,
    gate152,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV152Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
