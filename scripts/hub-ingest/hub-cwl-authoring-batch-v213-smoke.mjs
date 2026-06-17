#!/usr/bin/env node
/** Full-stack authoring batch v213 (G3429): v212 + Post-73/74/75 flagship HTTP express replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV212Smoke } from "./hub-cwl-authoring-batch-v212-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost213GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V213_KIND = "chrysalis.hub.cwl-authoring-batch-v213";
export const HUB_CWL_AUTHORING_BATCH_V213_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV213Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV212 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV212Smoke(resolvePriorBatchOpts(opts, 212));
  const gate213 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost213GraduationGate({ repoRoot });
  const ok = batchV212.ok === true && gate213.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V213_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V213_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate213Mode: skipPrior ? "evidence-trend" : "post213-graduation",
    batchV212,
    gate213,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV213Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
