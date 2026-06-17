#!/usr/bin/env node
/** Full-stack authoring batch v363 (G4929): v362 + Post-65 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV362Smoke } from "./hub-cwl-authoring-batch-v362-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost363GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V363_KIND = "chrysalis.hub.cwl-authoring-batch-v363";
export const HUB_CWL_AUTHORING_BATCH_V363_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV363Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV362 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV362Smoke(resolvePriorBatchOpts(opts, 362));
  const gate363 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost363GraduationGate({ repoRoot });
  const ok = batchV362.ok === true && gate363.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V363_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V363_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate363Mode: skipPrior ? "evidence-trend" : "post363-graduation",
    batchV362,
    gate363,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV363Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
