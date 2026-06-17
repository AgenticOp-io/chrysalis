#!/usr/bin/env node
/** Full-stack authoring batch v159 (G2889): v158 + Post-76 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV158Smoke } from "./hub-cwl-authoring-batch-v158-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost159GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V159_KIND = "chrysalis.hub.cwl-authoring-batch-v159";
export const HUB_CWL_AUTHORING_BATCH_V159_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV159Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV158 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV158Smoke(resolvePriorBatchOpts(opts, 158));
  const gate159 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost159GraduationGate({ repoRoot });
  const ok = batchV158.ok === true && gate159.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V159_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V159_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate159Mode: skipPrior ? "evidence-trend" : "post159-graduation",
    batchV158,
    gate159,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV159Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
