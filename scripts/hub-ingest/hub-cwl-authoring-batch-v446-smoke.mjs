#!/usr/bin/env node
/** Full-stack authoring batch v446 (G5757): v445 + post-446 maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV445Smoke } from "./hub-cwl-authoring-batch-v445-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost446GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V446_KIND = "chrysalis.hub.cwl-authoring-batch-v446";
export const HUB_CWL_AUTHORING_BATCH_V446_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV446Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV445 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV445Smoke(resolvePriorBatchOpts(opts, 445));
  const gate446 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost446GraduationGate({ repoRoot });
  const ok = batchV445.ok === true && gate446.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V446_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V446_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate446Mode: skipPrior ? "evidence-trend" : "post446-graduation",
    batchV445,
    gate446,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV446Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
