#!/usr/bin/env node
/** Full-stack authoring batch v74 (G1891): v73 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV73Smoke } from "./hub-cwl-authoring-batch-v73-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost73GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runCwlFullstackFlagshipGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V74_KIND = "chrysalis.hub.cwl-authoring-batch-v74";
export const HUB_CWL_AUTHORING_BATCH_V74_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV74Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV73 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV73Smoke(resolvePriorBatchOpts(opts, 73));
  const gate74 = skipPrior
    ? await runCwlFullstackFlagshipGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost73GraduationGate({ repoRoot });
  const ok = batchV73.ok === true && gate74.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V74_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V74_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate74Mode: skipPrior ? "fullstack-flagship-pilot" : "post73-graduation",
    batchV73,
    gate74,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV74Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
