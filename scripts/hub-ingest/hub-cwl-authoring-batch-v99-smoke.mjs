#!/usr/bin/env node
/** Full-stack authoring batch v99 (G2141): v98 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV98Smoke } from "./hub-cwl-authoring-batch-v98-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost98GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runIrHelperLiftingGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V99_KIND = "chrysalis.hub.cwl-authoring-batch-v99";
export const HUB_CWL_AUTHORING_BATCH_V99_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV99Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV98 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV98Smoke(resolvePriorBatchOpts(opts, 98));
  const gate99 = skipPrior
    ? await runIrHelperLiftingGate()
    : await runPost98GraduationGate({ repoRoot });
  const ok = batchV98.ok === true && gate99.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V99_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V99_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate99Mode: skipPrior ? "ir-helper-lifting" : "post98-graduation",
    batchV98,
    gate99,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV99Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
