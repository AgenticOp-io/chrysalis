#!/usr/bin/env node
/** Full-stack authoring batch v121 (G2509): v120 + CWL preview + OpenAPI page. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV120Smoke } from "./hub-cwl-authoring-batch-v120-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost121GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V121_KIND = "chrysalis.hub.cwl-authoring-batch-v121";
export const HUB_CWL_AUTHORING_BATCH_V121_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV121Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV120 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV120Smoke(resolvePriorBatchOpts(opts, 120));
  const gate121 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost121GraduationGate({ repoRoot });
  const ok = batchV120.ok === true && gate121.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V121_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V121_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate121Mode: skipPrior ? "evidence-trend" : "post121-graduation",
    batchV120,
    gate121,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV121Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
