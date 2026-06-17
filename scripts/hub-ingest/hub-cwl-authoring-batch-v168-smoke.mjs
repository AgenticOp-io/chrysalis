#!/usr/bin/env node
/** Full-stack authoring batch v168 (G2979): v167 + Post-85 post-translate express replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV167Smoke } from "./hub-cwl-authoring-batch-v167-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runEvidenceTrendStandaloneGate,
  runPost168GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V168_KIND = "chrysalis.hub.cwl-authoring-batch-v168";
export const HUB_CWL_AUTHORING_BATCH_V168_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV168Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV167 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV167Smoke(resolvePriorBatchOpts(opts, 167));
  const gate168 = skipPrior
    ? await runEvidenceTrendStandaloneGate()
    : await runPost168GraduationGate({ repoRoot });
  const ok = batchV167.ok === true && gate168.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V168_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V168_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate168Mode: skipPrior ? "evidence-trend" : "post168-graduation",
    batchV167,
    gate168,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV168Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
