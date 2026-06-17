#!/usr/bin/env node
/** Full-stack authoring batch v361 (G4909): v360 + Post-63 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV360Smoke } from "./hub-cwl-authoring-batch-v360-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost361GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V361_KIND = "chrysalis.hub.cwl-authoring-batch-v361";
export const HUB_CWL_AUTHORING_BATCH_V361_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV361Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV360 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV360Smoke(resolvePriorBatchOpts(opts, 360));
  const gate361 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost361GraduationGate({ repoRoot });
  const ok = batchV360.ok === true && gate361.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V361_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V361_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate361Mode: skipPrior ? "evidence-trend" : "post361-graduation",
    batchV360,
    gate361,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV361Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
