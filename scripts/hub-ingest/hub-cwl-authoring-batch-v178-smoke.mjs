#!/usr/bin/env node
/** Full-stack authoring batch v178 (G3079): v177 + Post-105 oracle product ultra replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV177Smoke } from "./hub-cwl-authoring-batch-v177-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost178GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V178_KIND = "chrysalis.hub.cwl-authoring-batch-v178";
export const HUB_CWL_AUTHORING_BATCH_V178_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV178Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV177 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV177Smoke(resolvePriorBatchOpts(opts, 177));
  const gate178 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost178GraduationGate({ repoRoot });
  const ok = batchV177.ok === true && gate178.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V178_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V178_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate178Mode: skipPrior ? "evidence-trend" : "post178-graduation",
    batchV177,
    gate178,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV178Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
