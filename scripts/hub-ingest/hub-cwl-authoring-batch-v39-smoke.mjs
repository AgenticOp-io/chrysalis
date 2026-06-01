#!/usr/bin/env node
/**
 * Full-stack authoring batch v39 (G1541): v38 + Dual-backend HTTP emit verify mega.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV38Smoke } from "./hub-cwl-authoring-batch-v38-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runEmitVerifyMegaGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V39_KIND = "chrysalis.hub.cwl-authoring-batch-v39";
export const HUB_CWL_AUTHORING_BATCH_V39_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV39Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV38 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV38Smoke(resolvePriorBatchOpts(opts, 38));
  const gate39 = await runEmitVerifyMegaGate({ repoRoot });
  const ok = batchV38.ok === true && gate39.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V39_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V39_SCHEMA_VERSION,
    ok,
    batchV38,
    gate39,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV39Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
