#!/usr/bin/env node
/** Full-stack authoring batch v145 (G2749): v144 + Phase D graduation lock (hub ops mega). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV144Smoke } from "./hub-cwl-authoring-batch-v144-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost145GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V145_KIND = "chrysalis.hub.cwl-authoring-batch-v145";
export const HUB_CWL_AUTHORING_BATCH_V145_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV145Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV144 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV144Smoke(resolvePriorBatchOpts(opts, 144));
  const gate145 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost145GraduationGate({ repoRoot });
  const ok = batchV144.ok === true && gate145.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V145_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V145_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate145Mode: skipPrior ? "evidence-trend" : "post145-graduation",
    batchV144,
    gate145,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV145Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
