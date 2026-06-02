#!/usr/bin/env node
/** Full-stack authoring batch v84 (G1991): v83 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV83Smoke } from "./hub-cwl-authoring-batch-v83-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost83GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runTranslateE2eFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V84_KIND = "chrysalis.hub.cwl-authoring-batch-v84";
export const HUB_CWL_AUTHORING_BATCH_V84_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV84Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV83 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV83Smoke(resolvePriorBatchOpts(opts, 83));
  const gate84 = skipPrior
    ? await runTranslateE2eFullstackGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost83GraduationGate({ repoRoot });
  const ok = batchV83.ok === true && gate84.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V84_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V84_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate84Mode: skipPrior ? "translate-e2e" : "post83-graduation",
    batchV83,
    gate84,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV84Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
