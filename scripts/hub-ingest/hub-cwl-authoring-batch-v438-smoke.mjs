#!/usr/bin/env node
/** Full-stack authoring batch v438 (G5677): v437 + post-437 IR Helper Program close (G7200) + maintenance graduation replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV437Smoke } from "./hub-cwl-authoring-batch-v437-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost438GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V438_KIND = "chrysalis.hub.cwl-authoring-batch-v438";
export const HUB_CWL_AUTHORING_BATCH_V438_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV438Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV437 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV437Smoke(resolvePriorBatchOpts(opts, 437));
  const gate438 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost438GraduationGate({ repoRoot });
  const ok = batchV437.ok === true && gate438.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V438_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V438_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate438Mode: skipPrior ? "evidence-trend" : "post438-graduation",
    batchV437,
    gate438,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV438Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
