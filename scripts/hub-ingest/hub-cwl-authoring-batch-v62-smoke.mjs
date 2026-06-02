#!/usr/bin/env node
/**
 * Full-stack authoring batch v62 (G1771): v61 + CWL preview/dev loop gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV61Smoke } from "./hub-cwl-authoring-batch-v61-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost61CompositeGate, runPost61GraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V62_KIND = "chrysalis.hub.cwl-authoring-batch-v62";
export const HUB_CWL_AUTHORING_BATCH_V62_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV62Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV61 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV61Smoke(resolvePriorBatchOpts(opts, 61));
  const gate62 = skipPrior
    ? await runPost61CompositeGate({ repoRoot })
    : await runPost61GraduationGate({ repoRoot });
  const ok = batchV61.ok === true && gate62.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V62_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V62_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate62Mode: skipPrior ? "post61-composite" : "post61-graduation",
    batchV61,
    gate62,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV62Smoke();
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
