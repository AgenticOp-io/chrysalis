#!/usr/bin/env node
/** Full-stack authoring batch v305 (G4349): v304 + Post-78 composite replay depth (Phase N lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV304Smoke } from "./hub-cwl-authoring-batch-v304-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost305GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V305_KIND = "chrysalis.hub.cwl-authoring-batch-v305";
export const HUB_CWL_AUTHORING_BATCH_V305_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV305Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV304 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV304Smoke(resolvePriorBatchOpts(opts, 304));
  const gate305 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost305GraduationGate({ repoRoot });
  const ok = batchV304.ok === true && gate305.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V305_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V305_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate305Mode: skipPrior ? "evidence-trend" : "post305-graduation",
    batchV304,
    gate305,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV305Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
