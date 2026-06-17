#!/usr/bin/env node
/** Full-stack authoring batch v353 (G4829): v352 + Post-138 preview dev + post-60 replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV352Smoke } from "./hub-cwl-authoring-batch-v352-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost353GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V353_KIND = "chrysalis.hub.cwl-authoring-batch-v353";
export const HUB_CWL_AUTHORING_BATCH_V353_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV353Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV352 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV352Smoke(resolvePriorBatchOpts(opts, 352));
  const gate353 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost353GraduationGate({ repoRoot });
  const ok = batchV352.ok === true && gate353.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V353_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V353_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate353Mode: skipPrior ? "evidence-trend" : "post353-graduation",
    batchV352,
    gate353,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV353Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
