#!/usr/bin/env node
/** Full-stack authoring batch v70 (G1851): v69 + post-60 authoring graduation lock. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV69Smoke } from "./hub-cwl-authoring-batch-v69-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runAuthoringGraduationGate, runAuthoringGraduationLockGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V70_KIND = "chrysalis.hub.cwl-authoring-batch-v70";
export const HUB_CWL_AUTHORING_BATCH_V70_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV70Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV69 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV69Smoke(resolvePriorBatchOpts(opts, 69));
  const gate70 = skipPrior
    ? await runAuthoringGraduationLockGate({ repoRoot })
    : await runAuthoringGraduationGate({ repoRoot });
  const ok = batchV69.ok === true && gate70.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V70_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V70_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate70Mode: skipPrior ? "authoring-graduation-lock" : "authoring-graduation",
    batchV69,
    gate70,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV70Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
