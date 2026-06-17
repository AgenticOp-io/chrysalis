#!/usr/bin/env node
/** Full-stack authoring batch v328 (G4579): v327 + Post-113 production search replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV327Smoke } from "./hub-cwl-authoring-batch-v327-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost328GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V328_KIND = "chrysalis.hub.cwl-authoring-batch-v328";
export const HUB_CWL_AUTHORING_BATCH_V328_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV328Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV327 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV327Smoke(resolvePriorBatchOpts(opts, 327));
  const gate328 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost328GraduationGate({ repoRoot });
  const ok = batchV327.ok === true && gate328.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V328_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V328_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate328Mode: skipPrior ? "evidence-trend" : "post328-graduation",
    batchV327,
    gate328,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV328Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
