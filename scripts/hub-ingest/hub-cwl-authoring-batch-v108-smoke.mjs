#!/usr/bin/env node
/** Full-stack authoring batch v108 (G2231): v107 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV107Smoke } from "./hub-cwl-authoring-batch-v107-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost107GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runPost90VerifyGapsCompositeGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V108_KIND = "chrysalis.hub.cwl-authoring-batch-v108";
export const HUB_CWL_AUTHORING_BATCH_V108_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV108Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV107 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV107Smoke(resolvePriorBatchOpts(opts, 107));
  const gate108 = skipPrior
    ? await runPost90VerifyGapsCompositeGate()
    : await runPost107GraduationGate({ repoRoot });
  const ok = batchV107.ok === true && gate108.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V108_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V108_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate108Mode: skipPrior ? "post90-verify-gaps-composite" : "post107-graduation",
    batchV107,
    gate108,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV108Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
