#!/usr/bin/env node
/** Full-stack authoring batch v184 (G3139): v183 + Post-112 template/budget replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV183Smoke } from "./hub-cwl-authoring-batch-v183-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost184GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V184_KIND = "chrysalis.hub.cwl-authoring-batch-v184";
export const HUB_CWL_AUTHORING_BATCH_V184_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV184Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV183 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV183Smoke(resolvePriorBatchOpts(opts, 183));
  const gate184 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost184GraduationGate({ repoRoot });
  const ok = batchV183.ok === true && gate184.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V184_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V184_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate184Mode: skipPrior ? "evidence-trend" : "post184-graduation",
    batchV183,
    gate184,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV184Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
