#!/usr/bin/env node
/** Full-stack authoring batch v97 (G2121): v96 + hub verify-gaps bridge gate. */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthoringBatchV96Smoke } from "./hub-cwl-authoring-batch-v96-smoke.mjs";
import { resolvePriorBatchOpts } from "./hub-cwl-batch-opts.mjs";
import { runPost96GraduationGate } from "./hub-cwl-fullstack-gates.mjs";
import { runLaravelAuthProbeReingestFastifyGate } from "./hub-cwl-fullstack-gates.mjs";

export const HUB_CWL_AUTHORING_BATCH_V97_KIND = "chrysalis.hub.cwl-authoring-batch-v97";
export const HUB_CWL_AUTHORING_BATCH_V97_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runCwlAuthoringBatchV97Smoke(opts = {}) {
  const repoRoot = opts.repoRoot ?? scriptRoot;
  const skipPrior = opts.skipPriorChain === true;
  const batchV96 = skipPrior
    ? { ok: true, skip: "skip-prior-chain" }
    : await runCwlAuthoringBatchV96Smoke(resolvePriorBatchOpts(opts, 96));
  const gate97 = skipPrior
    ? await runLaravelAuthProbeReingestFastifyGate()
    : await runPost96GraduationGate({ repoRoot });
  const ok = batchV96.ok === true && gate97.ok === true;
  return {
    kind: HUB_CWL_AUTHORING_BATCH_V97_KIND,
    schemaVersion: HUB_CWL_AUTHORING_BATCH_V97_SCHEMA_VERSION,
    ok,
    skipPriorChain: skipPrior,
    gate97Mode: skipPrior ? "laravel-auth-probe-reingest-fastify" : "post96-graduation",
    batchV96,
    gate97,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlAuthoringBatchV97Smoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
