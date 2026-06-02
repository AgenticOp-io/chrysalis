#!/usr/bin/env node
/** Full-stack authoring batch v64 (G1791): v63 + CWL formatter/lint gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV63Smoke } from "./hub-cwl-authoring-batch-v63-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import {
  runCwlFormatterLintGate,
  runPost63GraduationGate,
} from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V64_KIND = "chrysalis.hub.cwl-authoring-batch-v64";
export const HUB_CWL_AUTHORING_BATCH_V64_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV64Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV63 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV63Smoke(resolvePriorBatchOpts(opts, 63));
  const gate64 = skipPrior
    ? await runCwlFormatterLintGate()
    : await runPost63GraduationGate({ repoRoot });
  const ok = batchV63.ok === true && gate64.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V64_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V64_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate64Mode: skipPrior ? "formatter-lint" : "post63-graduation",
    batchV63,
    gate64,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV64Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
