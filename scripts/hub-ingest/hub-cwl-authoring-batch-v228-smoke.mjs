#!/usr/bin/env node
/** Full-stack authoring batch v228 (G3579): v227 + Post-73 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV227Smoke } from "./hub-cwl-authoring-batch-v227-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost228GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V228_KIND = "chrysalis.hub.cwl-authoring-batch-v228";
export const HUB_CWL_AUTHORING_BATCH_V228_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV228Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV227 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV227Smoke(resolvePriorBatchOpts(opts, 227));
  const gate228 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost228GraduationGate({ repoRoot });
  const ok = batchV227.ok === true && gate228.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V228_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V228_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate228Mode: skipPrior ? "evidence-trend" : "post228-graduation",
    batchV227,
    gate228,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV228Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
