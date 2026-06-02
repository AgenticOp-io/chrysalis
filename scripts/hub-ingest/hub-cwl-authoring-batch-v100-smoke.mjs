#!/usr/bin/env node
/** Full-stack authoring batch v100 (G2151): v99 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV99Smoke } from "./hub-cwl-authoring-batch-v99-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost99GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runIrHelperSemanticLiftingGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V100_KIND = "chrysalis.hub.cwl-authoring-batch-v100";
export const HUB_CWL_AUTHORING_BATCH_V100_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV100Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV99 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV99Smoke(resolvePriorBatchOpts(opts, 99));
  const gate100 = skipPrior
    ? await runIrHelperSemanticLiftingGate()
    : await runPost99GraduationGate({ repoRoot });
  const ok = batchV99.ok === true && gate100.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V100_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V100_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate100Mode: skipPrior ? "ir-helper-semantic-lifting" : "post99-graduation",
    batchV99,
    gate100,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV100Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
