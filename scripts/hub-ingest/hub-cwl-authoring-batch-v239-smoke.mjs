#!/usr/bin/env node
/** Full-stack authoring batch v239 (G3689): v238 + Post-84 contract roundtrip replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV238Smoke } from "./hub-cwl-authoring-batch-v238-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost239GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V239_KIND = "chrysalis.hub.cwl-authoring-batch-v239";
export const HUB_CWL_AUTHORING_BATCH_V239_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV239Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV238 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV238Smoke(resolvePriorBatchOpts(opts, 238));
  const gate239 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost239GraduationGate({ repoRoot });
  const ok = batchV238.ok === true && gate239.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V239_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V239_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate239Mode: skipPrior ? "evidence-trend" : "post239-graduation",
    batchV238,
    gate239,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV239Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
