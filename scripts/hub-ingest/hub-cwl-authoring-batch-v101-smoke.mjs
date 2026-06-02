#!/usr/bin/env node
/** Full-stack authoring batch v101 (G2161): v100 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV100Smoke } from "./hub-cwl-authoring-batch-v100-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost100GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runSessionStubFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V101_KIND = "chrysalis.hub.cwl-authoring-batch-v101";
export const HUB_CWL_AUTHORING_BATCH_V101_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV101Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV100 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV100Smoke(resolvePriorBatchOpts(opts, 100));
  const gate101 = skipPrior
    ? await runSessionStubFullstackGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost100GraduationGate({ repoRoot });
  const ok = batchV100.ok === true && gate101.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V101_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V101_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate101Mode: skipPrior ? "session-stub" : "post100-graduation",
    batchV100,
    gate101,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV101Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
