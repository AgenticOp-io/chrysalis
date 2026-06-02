#!/usr/bin/env node
/** Full-stack authoring batch v86 (G2011): v85 + Month 2–3 gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV85Smoke } from "./hub-cwl-authoring-batch-v85-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost85GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPostTranslateVerifyExpressGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V86_KIND = "chrysalis.hub.cwl-authoring-batch-v86";
export const HUB_CWL_AUTHORING_BATCH_V86_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV86Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV85 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV85Smoke(resolvePriorBatchOpts(opts, 85));
  const gate86 = skipPrior
    ? await runPostTranslateVerifyExpressGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost85GraduationGate({ repoRoot });
  const ok = batchV85.ok === true && gate86.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V86_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V86_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate86Mode: skipPrior ? "post-translate-verify-express" : "post85-graduation",
    batchV85,
    gate86,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV86Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
