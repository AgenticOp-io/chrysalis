#!/usr/bin/env node
/** Full-stack authoring batch v272 (G4019): v271 + Post-128 auth-probe reingest HTTP replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV271Smoke } from "./hub-cwl-authoring-batch-v271-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost272GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V272_KIND = "chrysalis.hub.cwl-authoring-batch-v272";
export const HUB_CWL_AUTHORING_BATCH_V272_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV272Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV271 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV271Smoke(resolvePriorBatchOpts(opts, 271));
  const gate272 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost272GraduationGate({ repoRoot });
  const ok = batchV271.ok === true && gate272.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V272_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V272_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate272Mode: skipPrior ? "evidence-trend" : "post272-graduation",
    batchV271,
    gate272,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV272Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
