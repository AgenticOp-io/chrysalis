#!/usr/bin/env node
/** Full-stack authoring batch v354 (G4839): v353 + Post-139 runtime CWL parity stack replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV353Smoke } from "./hub-cwl-authoring-batch-v353-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost354GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V354_KIND = "chrysalis.hub.cwl-authoring-batch-v354";
export const HUB_CWL_AUTHORING_BATCH_V354_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV354Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV353 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV353Smoke(resolvePriorBatchOpts(opts, 353));
  const gate354 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost354GraduationGate({ repoRoot });
  const ok = batchV353.ok === true && gate354.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V354_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V354_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate354Mode: skipPrior ? "evidence-trend" : "post354-graduation",
    batchV353,
    gate354,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV354Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
