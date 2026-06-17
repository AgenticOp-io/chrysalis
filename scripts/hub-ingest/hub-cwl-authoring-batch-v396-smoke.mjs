#!/usr/bin/env node
/** Full-stack authoring batch v396 (G5259): v395 + Post-108 hub ops mega replay (Phase O lock) replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV395Smoke } from "./hub-cwl-authoring-batch-v395-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost396GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V396_KIND = "chrysalis.hub.cwl-authoring-batch-v396";
export const HUB_CWL_AUTHORING_BATCH_V396_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV396Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV395 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV395Smoke(resolvePriorBatchOpts(opts, 395));
  const gate396 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost396GraduationGate({ repoRoot });
  const ok = batchV395.ok === true && gate396.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V396_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V396_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate396Mode: skipPrior ? "evidence-trend" : "post396-graduation",
    batchV395,
    gate396,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV396Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
