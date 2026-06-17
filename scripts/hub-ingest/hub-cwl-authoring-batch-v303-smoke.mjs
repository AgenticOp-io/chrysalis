#!/usr/bin/env node
/** Full-stack authoring batch v303 (G4329): v302 + Post-76 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV302Smoke } from "./hub-cwl-authoring-batch-v302-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost303GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V303_KIND = "chrysalis.hub.cwl-authoring-batch-v303";
export const HUB_CWL_AUTHORING_BATCH_V303_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV303Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV302 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV302Smoke(resolvePriorBatchOpts(opts, 302));
  const gate303 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost303GraduationGate({ repoRoot });
  const ok = batchV302.ok === true && gate303.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V303_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V303_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate303Mode: skipPrior ? "evidence-trend" : "post303-graduation",
    batchV302,
    gate303,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV303Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
