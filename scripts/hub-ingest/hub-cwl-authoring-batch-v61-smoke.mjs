#!/usr/bin/env node
/**
 * Full-stack authoring batch v61 (G1761): v60 + CWL authoring templates gate.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV60Smoke } from "./hub-cwl-authoring-batch-v60-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost60CompositeGate, runPost60GraduationGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V61_KIND = "chrysalis.hub.cwl-authoring-batch-v61";
export const HUB_CWL_AUTHORING_BATCH_V61_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV61Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV60 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV60Smoke(resolvePriorBatchOpts(opts, 60));
  const gate61 = skipPrior
    ? await runPost60CompositeGate({ repoRoot })
    : await runPost60GraduationGate({ repoRoot });
  const ok = batchV60.ok === true && gate61.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V61_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V61_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate61Mode: skipPrior ? "post60-composite" : "post60-graduation",
    batchV60,
    gate61,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV61Smoke();
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
