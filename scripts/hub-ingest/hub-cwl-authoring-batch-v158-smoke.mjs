#!/usr/bin/env node
/** Full-stack authoring batch v158 (G2879): v157 + Post-75 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV157Smoke } from "./hub-cwl-authoring-batch-v157-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost158GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V158_KIND = "chrysalis.hub.cwl-authoring-batch-v158";
export const HUB_CWL_AUTHORING_BATCH_V158_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV158Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV157 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV157Smoke(resolvePriorBatchOpts(opts, 157));
  const gate158 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost158GraduationGate({ repoRoot });
  const ok = batchV157.ok === true && gate158.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V158_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V158_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate158Mode: skipPrior ? "evidence-trend" : "post158-graduation",
    batchV157,
    gate158,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV158Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
