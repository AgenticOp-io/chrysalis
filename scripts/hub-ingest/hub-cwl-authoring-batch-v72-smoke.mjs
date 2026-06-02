#!/usr/bin/env node
/** Full-stack authoring batch v72 (G1871): v71 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV71Smoke } from "./hub-cwl-authoring-batch-v71-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost71GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPageLoadParityGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V72_KIND = "chrysalis.hub.cwl-authoring-batch-v72";
export const HUB_CWL_AUTHORING_BATCH_V72_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV72Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV71 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV71Smoke(resolvePriorBatchOpts(opts, 71));
  const gate72 = skipPrior
    ? await runPageLoadParityGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost71GraduationGate({ repoRoot });
  const ok = batchV71.ok === true && gate72.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V72_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V72_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate72Mode: skipPrior ? "page-load-parity" : "post71-graduation",
    batchV71,
    gate72,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV72Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
