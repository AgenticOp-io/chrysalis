#!/usr/bin/env node
/** Full-stack authoring batch v148 (G2779): v147 + Post-65 composite replay depth. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV147Smoke } from "./hub-cwl-authoring-batch-v147-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost148GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V148_KIND = "chrysalis.hub.cwl-authoring-batch-v148";
export const HUB_CWL_AUTHORING_BATCH_V148_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV148Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV147 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV147Smoke(resolvePriorBatchOpts(opts, 147));
  const gate148 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost148GraduationGate({ repoRoot });
  const ok = batchV147.ok === true && gate148.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V148_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V148_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate148Mode: skipPrior ? "evidence-trend" : "post148-graduation",
    batchV147,
    gate148,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV148Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
