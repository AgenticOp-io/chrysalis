#!/usr/bin/env node
/** Full-stack authoring batch v410 (G5399): v409 + Post-124 bootstrap + production graduation replay replay.. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV409Smoke } from "./hub-cwl-authoring-batch-v409-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost410GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V410_KIND = "chrysalis.hub.cwl-authoring-batch-v410";
export const HUB_CWL_AUTHORING_BATCH_V410_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV410Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV409 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV409Smoke(resolvePriorBatchOpts(opts, 409));
  const gate410 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost410GraduationGate({ repoRoot });
  const ok = batchV409.ok === true && gate410.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V410_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V410_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate410Mode: skipPrior ? "evidence-trend" : "post410-graduation",
    batchV409,
    gate410,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV410Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
