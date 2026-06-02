#!/usr/bin/env node
/** Full-stack authoring batch v75 (G1901): v74 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV74Smoke } from "./hub-cwl-authoring-batch-v74-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost74GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runCwlFullstackVerifyHttpGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V75_KIND = "chrysalis.hub.cwl-authoring-batch-v75";
export const HUB_CWL_AUTHORING_BATCH_V75_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV75Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV74 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV74Smoke(resolvePriorBatchOpts(opts, 74));
  const gate75 = skipPrior
    ? await runCwlFullstackVerifyHttpGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost74GraduationGate({ repoRoot });
  const ok = batchV74.ok === true && gate75.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V75_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V75_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate75Mode: skipPrior ? "fullstack-flagship-http" : "post74-graduation",
    batchV74,
    gate75,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV75Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
