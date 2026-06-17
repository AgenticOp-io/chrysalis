#!/usr/bin/env node
/** Full-stack authoring batch v136 (G2659): v135 + Post-30 runtime + verify-gaps parity. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV135Smoke } from "./hub-cwl-authoring-batch-v135-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost136GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V136_KIND = "chrysalis.hub.cwl-authoring-batch-v136";
export const HUB_CWL_AUTHORING_BATCH_V136_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV136Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV135 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV135Smoke(resolvePriorBatchOpts(opts, 135));
  const gate136 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost136GraduationGate({ repoRoot });
  const ok = batchV135.ok === true && gate136.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V136_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V136_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate136Mode: skipPrior ? "evidence-trend" : "post136-graduation",
    batchV135,
    gate136,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV136Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
