#!/usr/bin/env node
/** Full-stack authoring batch v162 (G2919): v161 + Post-79 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV161Smoke } from "./hub-cwl-authoring-batch-v161-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost162GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V162_KIND = "chrysalis.hub.cwl-authoring-batch-v162";
export const HUB_CWL_AUTHORING_BATCH_V162_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV162Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV161 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV161Smoke(resolvePriorBatchOpts(opts, 161));
  const gate162 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost162GraduationGate({ repoRoot });
  const ok = batchV161.ok === true && gate162.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V162_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V162_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate162Mode: skipPrior ? "evidence-trend" : "post162-graduation",
    batchV161,
    gate162,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV162Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
