#!/usr/bin/env node
/** Full-stack authoring batch v85 (G2001): v84 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV84Smoke } from "./hub-cwl-authoring-batch-v84-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost84GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runContractRoundtripFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V85_KIND = "chrysalis.hub.cwl-authoring-batch-v85";
export const HUB_CWL_AUTHORING_BATCH_V85_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV85Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV84 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV84Smoke(resolvePriorBatchOpts(opts, 84));
  const gate85 = skipPrior
    ? await runContractRoundtripFullstackGate()
    : await runPost84GraduationGate({ repoRoot });
  const ok = batchV84.ok === true && gate85.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V85_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V85_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate85Mode: skipPrior ? "contract-roundtrip" : "post84-graduation",
    batchV84,
    gate85,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV85Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
