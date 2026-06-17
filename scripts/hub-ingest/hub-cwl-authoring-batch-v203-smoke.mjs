#!/usr/bin/env node
/** Full-stack authoring batch v203 (G3329): v202 + Post-131 session + runtime replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV202Smoke } from "./hub-cwl-authoring-batch-v202-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost203GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V203_KIND = "chrysalis.hub.cwl-authoring-batch-v203";
export const HUB_CWL_AUTHORING_BATCH_V203_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV203Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV202 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV202Smoke(resolvePriorBatchOpts(opts, 202));
  const gate203 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost203GraduationGate({ repoRoot });
  const ok = batchV202.ok === true && gate203.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V203_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V203_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate203Mode: skipPrior ? "evidence-trend" : "post203-graduation",
    batchV202,
    gate203,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV203Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
