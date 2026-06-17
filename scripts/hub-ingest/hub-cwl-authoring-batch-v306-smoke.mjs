#!/usr/bin/env node
/** Full-stack authoring batch v306 (G4359): v305 + Post-79 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV305Smoke } from "./hub-cwl-authoring-batch-v305-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost306GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V306_KIND = "chrysalis.hub.cwl-authoring-batch-v306";
export const HUB_CWL_AUTHORING_BATCH_V306_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV306Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV305 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV305Smoke(resolvePriorBatchOpts(opts, 305));
  const gate306 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost306GraduationGate({ repoRoot });
  const ok = batchV305.ok === true && gate306.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V306_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V306_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate306Mode: skipPrior ? "evidence-trend" : "post306-graduation",
    batchV305,
    gate306,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV306Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
