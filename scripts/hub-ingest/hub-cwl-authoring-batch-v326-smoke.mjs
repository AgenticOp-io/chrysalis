#!/usr/bin/env node
/** Full-stack authoring batch v326 (G4559): v325 + Post-111 Phase C pilot replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV325Smoke } from "./hub-cwl-authoring-batch-v325-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost326GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V326_KIND = "chrysalis.hub.cwl-authoring-batch-v326";
export const HUB_CWL_AUTHORING_BATCH_V326_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV326Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV325 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV325Smoke(resolvePriorBatchOpts(opts, 325));
  const gate326 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost326GraduationGate({ repoRoot });
  const ok = batchV325.ok === true && gate326.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V326_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V326_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate326Mode: skipPrior ? "evidence-trend" : "post326-graduation",
    batchV325,
    gate326,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV326Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
