#!/usr/bin/env node
/** Full-stack authoring batch v73 (G1881): v72 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV72Smoke } from "./hub-cwl-authoring-batch-v72-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost72GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runGoldRuntimeFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V73_KIND = "chrysalis.hub.cwl-authoring-batch-v73";
export const HUB_CWL_AUTHORING_BATCH_V73_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV73Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV72 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV72Smoke(resolvePriorBatchOpts(opts, 72));
  const gate73 = skipPrior
    ? await runGoldRuntimeFullstackGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost72GraduationGate({ repoRoot });
  const ok = batchV72.ok === true && gate73.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V73_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V73_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate73Mode: skipPrior ? "gold-runtime-fullstack" : "post72-graduation",
    batchV72,
    gate73,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV73Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
