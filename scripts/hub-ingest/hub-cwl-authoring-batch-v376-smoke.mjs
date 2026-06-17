#!/usr/bin/env node
/** Full-stack authoring batch v376 (G5059): v375 + Post-78 composite replay depth (Phase N lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV375Smoke } from "./hub-cwl-authoring-batch-v375-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost376GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V376_KIND = "chrysalis.hub.cwl-authoring-batch-v376";
export const HUB_CWL_AUTHORING_BATCH_V376_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV376Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV375 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV375Smoke(resolvePriorBatchOpts(opts, 375));
  const gate376 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost376GraduationGate({ repoRoot });
  const ok = batchV375.ok === true && gate376.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V376_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V376_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate376Mode: skipPrior ? "evidence-trend" : "post376-graduation",
    batchV375,
    gate376,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV376Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
