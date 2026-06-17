#!/usr/bin/env node
/** Full-stack authoring batch v124 (G2539): v123 + Bootstrap v2 + mega origin + production graduation. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV123Smoke } from "./hub-cwl-authoring-batch-v123-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost124GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V124_KIND = "chrysalis.hub.cwl-authoring-batch-v124";
export const HUB_CWL_AUTHORING_BATCH_V124_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV124Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV123 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV123Smoke(resolvePriorBatchOpts(opts, 123));
  const gate124 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost124GraduationGate({ repoRoot });
  const ok = batchV123.ok === true && gate124.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V124_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V124_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate124Mode: skipPrior ? "evidence-trend" : "post124-graduation",
    batchV123,
    gate124,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV124Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
