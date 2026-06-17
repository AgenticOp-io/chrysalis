#!/usr/bin/env node
/** Full-stack authoring batch v317 (G4469): v316 + Post-100 session stub replay (Phase K lock) replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV316Smoke } from "./hub-cwl-authoring-batch-v316-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost317GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V317_KIND = "chrysalis.hub.cwl-authoring-batch-v317";
export const HUB_CWL_AUTHORING_BATCH_V317_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV317Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV316 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV316Smoke(resolvePriorBatchOpts(opts, 316));
  const gate317 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost317GraduationGate({ repoRoot });
  const ok = batchV316.ok === true && gate317.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V317_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V317_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate317Mode: skipPrior ? "evidence-trend" : "post317-graduation",
    batchV316,
    gate317,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV317Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
