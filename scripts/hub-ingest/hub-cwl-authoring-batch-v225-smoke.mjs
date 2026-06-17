#!/usr/bin/env node
/** Full-stack authoring batch v225 (G3549): v224 + Post-70 composite replay depth (Phase J lock). */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV224Smoke } from "./hub-cwl-authoring-batch-v224-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost225GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V225_KIND = "chrysalis.hub.cwl-authoring-batch-v225";
export const HUB_CWL_AUTHORING_BATCH_V225_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV225Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV224 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV224Smoke(resolvePriorBatchOpts(opts, 224));
  const gate225 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost225GraduationGate({ repoRoot });
  const ok = batchV224.ok === true && gate225.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V225_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V225_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate225Mode: skipPrior ? "evidence-trend" : "post225-graduation",
    batchV224,
    gate225,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV225Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
