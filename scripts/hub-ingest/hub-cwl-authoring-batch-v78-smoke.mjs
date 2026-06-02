#!/usr/bin/env node
/** Full-stack authoring batch v78 (G1931): v77 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV77Smoke } from "./hub-cwl-authoring-batch-v77-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost77GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runSvelteSearchQueryExportGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V78_KIND = "chrysalis.hub.cwl-authoring-batch-v78";
export const HUB_CWL_AUTHORING_BATCH_V78_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV78Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV77 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV77Smoke(resolvePriorBatchOpts(opts, 77));
  const gate78 = skipPrior
    ? await runSvelteSearchQueryExportGate()
    : await runPost77GraduationGate({ repoRoot });
  const ok = batchV77.ok === true && gate78.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V78_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V78_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate78Mode: skipPrior ? "svelte-search-export" : "post77-graduation",
    batchV77,
    gate78,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV78Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
