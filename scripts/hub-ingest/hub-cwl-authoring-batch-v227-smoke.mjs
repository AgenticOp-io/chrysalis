#!/usr/bin/env node
/** Full-stack authoring batch v227 (G3569): v226 + Post-72 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV226Smoke } from "./hub-cwl-authoring-batch-v226-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost227GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V227_KIND = "chrysalis.hub.cwl-authoring-batch-v227";
export const HUB_CWL_AUTHORING_BATCH_V227_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV227Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV226 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV226Smoke(resolvePriorBatchOpts(opts, 226));
  const gate227 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost227GraduationGate({ repoRoot });
  const ok = batchV226.ok === true && gate227.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V227_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V227_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate227Mode: skipPrior ? "evidence-trend" : "post227-graduation",
    batchV226,
    gate227,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV227Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
