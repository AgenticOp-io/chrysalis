#!/usr/bin/env node
/** Full-stack authoring batch v296 (G4259): v295 + Post-69 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV295Smoke } from "./hub-cwl-authoring-batch-v295-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost296GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V296_KIND = "chrysalis.hub.cwl-authoring-batch-v296";
export const HUB_CWL_AUTHORING_BATCH_V296_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV296Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV295 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV295Smoke(resolvePriorBatchOpts(opts, 295));
  const gate296 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost296GraduationGate({ repoRoot });
  const ok = batchV295.ok === true && gate296.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V296_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V296_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate296Mode: skipPrior ? "evidence-trend" : "post296-graduation",
    batchV295,
    gate296,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV296Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
