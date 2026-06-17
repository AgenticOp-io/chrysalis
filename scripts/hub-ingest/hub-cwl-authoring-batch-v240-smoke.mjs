#!/usr/bin/env node
/** Full-stack authoring batch v240 (G3699): v239 + Post-85 post-translate express replay replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV239Smoke } from "./hub-cwl-authoring-batch-v239-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost240GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V240_KIND = "chrysalis.hub.cwl-authoring-batch-v240";
export const HUB_CWL_AUTHORING_BATCH_V240_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV240Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV239 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV239Smoke(resolvePriorBatchOpts(opts, 239));
  const gate240 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost240GraduationGate({ repoRoot });
  const ok = batchV239.ok === true && gate240.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V240_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V240_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate240Mode: skipPrior ? "evidence-trend" : "post240-graduation",
    batchV239,
    gate240,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV240Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
