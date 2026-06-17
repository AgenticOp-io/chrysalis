#!/usr/bin/env node
/** Full-stack authoring batch v309 (G4389): v308 + Post-82 composite replay depth replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV308Smoke } from "./hub-cwl-authoring-batch-v308-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost309GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V309_KIND = "chrysalis.hub.cwl-authoring-batch-v309";
export const HUB_CWL_AUTHORING_BATCH_V309_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV309Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV308 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV308Smoke(resolvePriorBatchOpts(opts, 308));
  const gate309 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost309GraduationGate({ repoRoot });
  const ok = batchV308.ok === true && gate309.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V309_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V309_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate309Mode: skipPrior ? "evidence-trend" : "post309-graduation",
    batchV308,
    gate309,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV309Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
