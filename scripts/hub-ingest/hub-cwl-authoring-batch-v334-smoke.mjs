#!/usr/bin/env node
/** Full-stack authoring batch v334 (G4639): v333 + Post-119 gold runtime + parity replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV333Smoke } from "./hub-cwl-authoring-batch-v333-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost334GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V334_KIND = "chrysalis.hub.cwl-authoring-batch-v334";
export const HUB_CWL_AUTHORING_BATCH_V334_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV334Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV333 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV333Smoke(resolvePriorBatchOpts(opts, 333));
  const gate334 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost334GraduationGate({ repoRoot });
  const ok = batchV333.ok === true && gate334.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V334_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V334_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate334Mode: skipPrior ? "evidence-trend" : "post334-graduation",
    batchV333,
    gate334,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV334Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
