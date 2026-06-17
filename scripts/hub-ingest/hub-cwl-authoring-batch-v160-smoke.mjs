#!/usr/bin/env node
/** Full-stack authoring batch v160 (G2899): v159 + Post-77 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV159Smoke } from "./hub-cwl-authoring-batch-v159-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost160GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V160_KIND = "chrysalis.hub.cwl-authoring-batch-v160";
export const HUB_CWL_AUTHORING_BATCH_V160_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV160Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV159 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV159Smoke(resolvePriorBatchOpts(opts, 159));
  const gate160 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost160GraduationGate({ repoRoot });
  const ok = batchV159.ok === true && gate160.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V160_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V160_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate160Mode: skipPrior ? "evidence-trend" : "post160-graduation",
    batchV159,
    gate160,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV160Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
