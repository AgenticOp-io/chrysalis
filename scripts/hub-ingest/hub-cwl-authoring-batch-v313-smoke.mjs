#!/usr/bin/env node
/** Full-stack authoring batch v313 (G4429): v312 + Post-86 CWL roundtrip replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV312Smoke } from "./hub-cwl-authoring-batch-v312-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost313GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V313_KIND = "chrysalis.hub.cwl-authoring-batch-v313";
export const HUB_CWL_AUTHORING_BATCH_V313_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV313Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV312 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV312Smoke(resolvePriorBatchOpts(opts, 312));
  const gate313 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost313GraduationGate({ repoRoot });
  const ok = batchV312.ok === true && gate313.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V313_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V313_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate313Mode: skipPrior ? "evidence-trend" : "post313-graduation",
    batchV312,
    gate313,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV313Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
