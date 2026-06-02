#!/usr/bin/env node
/** Full-stack authoring batch v68 (G1831): v67 + post-60 authoring composite replay. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV67Smoke } from "./hub-cwl-authoring-batch-v67-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runPost60AuthoringCompositeGate,
  runPost67GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V68_KIND = "chrysalis.hub.cwl-authoring-batch-v68";
export const HUB_CWL_AUTHORING_BATCH_V68_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV68Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV67 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV67Smoke(resolvePriorBatchOpts(opts, 67));
  const gate68 = skipPrior
    ? await runPost60AuthoringCompositeGate({ repoRoot })
    : await runPost67GraduationGate({ repoRoot });
  const ok = batchV67.ok === true && gate68.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V68_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V68_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate68Mode: skipPrior ? "post60-authoring-composite" : "post67-graduation",
    batchV67,
    gate68,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV68Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
