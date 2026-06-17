#!/usr/bin/env node
/** Full-stack authoring batch v346 (G4759): v345 + Post-131 session + runtime replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV345Smoke } from "./hub-cwl-authoring-batch-v345-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost346GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V346_KIND = "chrysalis.hub.cwl-authoring-batch-v346";
export const HUB_CWL_AUTHORING_BATCH_V346_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV346Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV345 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV345Smoke(resolvePriorBatchOpts(opts, 345));
  const gate346 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost346GraduationGate({ repoRoot });
  const ok = batchV345.ok === true && gate346.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V346_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V346_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate346Mode: skipPrior ? "evidence-trend" : "post346-graduation",
    batchV345,
    gate346,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV346Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
