#!/usr/bin/env node
/** Full-stack authoring batch v151 (G2809): v150 + Post-68 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV150Smoke } from "./hub-cwl-authoring-batch-v150-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost151GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V151_KIND = "chrysalis.hub.cwl-authoring-batch-v151";
export const HUB_CWL_AUTHORING_BATCH_V151_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV151Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV150 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV150Smoke(resolvePriorBatchOpts(opts, 150));
  const gate151 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost151GraduationGate({ repoRoot });
  const ok = batchV150.ok === true && gate151.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V151_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V151_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate151Mode: skipPrior ? "evidence-trend" : "post151-graduation",
    batchV150,
    gate151,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV151Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
