#!/usr/bin/env node
/** Full-stack authoring batch v103 (G2181): v102 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV102Smoke } from "./hub-cwl-authoring-batch-v102-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost102GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runEmitPageProbeFullstackGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V103_KIND = "chrysalis.hub.cwl-authoring-batch-v103";
export const HUB_CWL_AUTHORING_BATCH_V103_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV103Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV102 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV102Smoke(resolvePriorBatchOpts(opts, 102));
  const gate103 = skipPrior
    ? await runEmitPageProbeFullstackGate(opts.repoRoot ? { repoRoot: opts.repoRoot } : {})
    : await runPost102GraduationGate({ repoRoot });
  const ok = batchV102.ok === true && gate103.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V103_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V103_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate103Mode: skipPrior ? "emit-page-probe" : "post102-graduation",
    batchV102,
    gate103,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV103Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
