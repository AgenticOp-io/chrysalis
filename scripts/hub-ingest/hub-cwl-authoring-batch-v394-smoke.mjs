#!/usr/bin/env node
/** Full-stack authoring batch v394 (G5239): v393 + Post-106 verify standalone mega replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV393Smoke } from "./hub-cwl-authoring-batch-v393-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost394GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V394_KIND = "chrysalis.hub.cwl-authoring-batch-v394";
export const HUB_CWL_AUTHORING_BATCH_V394_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV394Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV393 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV393Smoke(resolvePriorBatchOpts(opts, 393));
  const gate394 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost394GraduationGate({ repoRoot });
  const ok = batchV393.ok === true && gate394.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V394_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V394_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate394Mode: skipPrior ? "evidence-trend" : "post394-graduation",
    batchV393,
    gate394,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV394Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
