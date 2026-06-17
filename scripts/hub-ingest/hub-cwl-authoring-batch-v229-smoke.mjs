#!/usr/bin/env node
/** Full-stack authoring batch v229 (G3589): v228 + Post-74 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV228Smoke } from "./hub-cwl-authoring-batch-v228-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost229GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V229_KIND = "chrysalis.hub.cwl-authoring-batch-v229";
export const HUB_CWL_AUTHORING_BATCH_V229_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV229Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV228 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV228Smoke(resolvePriorBatchOpts(opts, 228));
  const gate229 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost229GraduationGate({ repoRoot });
  const ok = batchV228.ok === true && gate229.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V229_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V229_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate229Mode: skipPrior ? "evidence-trend" : "post229-graduation",
    batchV228,
    gate229,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV229Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
