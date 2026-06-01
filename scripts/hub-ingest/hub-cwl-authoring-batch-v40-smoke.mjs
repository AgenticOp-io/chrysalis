#!/usr/bin/env node
/**
 * Full-stack authoring batch v40 (G1551): v39 + Post-30 production graduation lock.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV39Smoke } from "./hub-cwl-authoring-batch-v39-smoke.mjs";
import { runPost30CompositeGate, runPost30GraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V40_KIND = "chrysalis.hub.cwl-authoring-batch-v40";
export const HUB_CWL_AUTHORING_BATCH_V40_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV40Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV39 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV39Smoke({
        ...opts,
        
      });
  const gate40 = skipPrior
    ? await runPost30CompositeGate({ repoRoot })
    : await runPost30GraduationGate({ repoRoot });
  const ok = batchV39.ok === true && gate40.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V40_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V40_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate40Mode: skipPrior ? "post30-composite" : "post30-graduation",
    batchV39,
    gate40,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV40Smoke();
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
