#!/usr/bin/env node
/** Full-stack authoring batch v125 (G2549): v124 + Phase C graduation lock (post-115 hub lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV124Smoke } from "./hub-cwl-authoring-batch-v124-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost125GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V125_KIND = "chrysalis.hub.cwl-authoring-batch-v125";
export const HUB_CWL_AUTHORING_BATCH_V125_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV125Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV124 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV124Smoke(resolvePriorBatchOpts(opts, 124));
  const gate125 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost125GraduationGate({ repoRoot });
  const ok = batchV124.ok === true && gate125.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V125_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V125_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate125Mode: skipPrior ? "evidence-trend" : "post125-graduation",
    batchV124,
    gate125,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV125Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
