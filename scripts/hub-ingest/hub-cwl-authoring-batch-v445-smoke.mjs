#!/usr/bin/env node
/** Full-stack authoring batch v445 (G5747): v444 + post-445 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV444Smoke } from "./hub-cwl-authoring-batch-v444-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost445GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V445_KIND = "chrysalis.hub.cwl-authoring-batch-v445";
export const HUB_CWL_AUTHORING_BATCH_V445_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV445Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV444 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV444Smoke(resolvePriorBatchOpts(opts, 444));
  const gate445 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost445GraduationGate({ repoRoot });
  const ok = batchV444.ok === true && gate445.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V445_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V445_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate445Mode: skipPrior ? "evidence-trend" : "post445-graduation",
    batchV444,
    gate445,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV445Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
